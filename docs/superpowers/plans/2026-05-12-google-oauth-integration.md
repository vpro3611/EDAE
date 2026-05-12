# Google OAuth 2.0 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Google OAuth 2.0 authentication into EDAE using the Authorization Code Flow.

**Architecture:** Use `google-auth-library` on the backend to exchange codes for tokens and verify ID tokens. Introduce a `user_external_logins` table to link Google accounts to users. Automatically link accounts if the email matches an existing user.

**Tech Stack:** Node.js, Express, PostgreSQL, Vue.js, `google-auth-library`.

---

### Task 1: Infrastructure & Dependencies

**Files:**
- Modify: `package.json`
- Modify: `frontend/package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install backend dependencies**
Run: `npm install google-auth-library`

- [ ] **Step 2: Install frontend dependencies**
Run: `cd frontend && npm install vue3-google-signin`

- [ ] **Step 3: Update .env.example**
Add Google OAuth placeholders:
```env
# ── Google OAuth ──────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

- [ ] **Step 4: Commit**
```bash
git add package.json package-lock.json frontend/package.json frontend/package-lock.json .env.example
git commit -m "chore: add google oauth dependencies and env placeholders"
```

---

### Task 2: Database Migration

**Files:**
- Create: `migrations/1778600000000_create-external-logins-table.ts`
- Create: `migrations/1778610000000_make-password-nullable.ts`

- [ ] **Step 1: Create migration for user_external_logins**
```typescript
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('user_external_logins', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    provider: { type: 'varchar(50)', notNull: true },
    external_id: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('user_external_logins', 'unique_provider_external_id', {
    unique: ['provider', 'external_id']
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('user_external_logins');
}
```

- [ ] **Step 2: Create migration to make password nullable**
```typescript
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('users', 'password_hashed', { allowNull: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('users', 'password_hashed', { allowNull: false });
}
```

- [ ] **Step 3: Run migrations**
Run: `npm run migrate up` (assuming this is the command based on project structure)

- [ ] **Step 4: Commit**
```bash
git add migrations/1778600000000_create-external-logins-table.ts migrations/1778610000000_make-password-nullable.ts
git commit -m "db: create user_external_logins table and make password nullable"
```

---

### Task 3: External Login Repository

**Files:**
- Create: `src/modules/user/interfaces/interface.repository.external_login.ts`
- Create: `src/modules/user/repository/repository.user.external_login.ts`

- [ ] **Step 1: Define External Login Repository Interface**
```typescript
export interface ExternalLoginRepoInterface {
  findByProviderAndExternalId(provider: string, externalId: string): Promise<string | null>;
  create(userId: string, provider: string, externalId: string): Promise<void>;
}
```

- [ ] **Step 2: Implement External Login Repository**
```typescript
import { ExternalLoginRepoInterface } from "../interfaces/interface.repository.external_login";
import { Pool, PoolClient } from "pg";
import { handleDatabaseError } from "../../errors/mapper.database";

export class RepositoryUserExternalLogin implements ExternalLoginRepoInterface {
  private moduleName = "RepositoryUserExternalLogin";
  constructor(private readonly db: Pool | PoolClient) {}

  static create(db: Pool | PoolClient) {
    return new RepositoryUserExternalLogin(db);
  }

  async findByProviderAndExternalId(provider: string, externalId: string): Promise<string | null> {
    try {
      const result = await this.db.query(
        "SELECT user_id FROM user_external_logins WHERE provider = $1 AND external_id = $2",
        [provider, externalId]
      );
      return result.rows[0]?.user_id || null;
    } catch (e) {
      handleDatabaseError(e, `${this.moduleName}.findByProviderAndExternalId`);
    }
  }

  async create(userId: string, provider: string, externalId: string): Promise<void> {
    try {
      await this.db.query(
        "INSERT INTO user_external_logins (user_id, provider, external_id) VALUES ($1, $2, $3)",
        [userId, provider, externalId]
      );
    } catch (e) {
      handleDatabaseError(e, `${this.moduleName}.create`);
    }
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add src/modules/user/interfaces/interface.repository.external_login.ts src/modules/user/repository/repository.user.external_login.ts
git commit -m "feat: add user external login repository"
```

---

### Task 4: Google Auth Use Case

**Files:**
- Create: `src/modules/authentification/usecases/auth.google_login.usecase.ts`

- [ ] **Step 1: Implement Google Login Use Case**
```typescript
import { OAuth2Client } from 'google-auth-library';
import { UserRepoReaderInterface, UserRepoWriterInterface } from "../../user/interfaces/interface.repository";
import { ExternalLoginRepoInterface } from "../../user/interfaces/interface.repository.external_login";
import { UserDtoMapper } from "../../user/dto/user.dto.mapper";
import { UserDtoForSelf } from "../../user/dto/user.dto";
import { throwAppError } from "../../errors/errors.global";
import { User } from "../../user/entity/user";

export class GoogleLoginUseCase {
  private client: OAuth2Client;

  constructor(
    private readonly userRepoReader: UserRepoReaderInterface,
    private readonly userRepoWriter: UserRepoWriterInterface,
    private readonly externalLoginRepo: ExternalLoginRepoInterface,
    private readonly userDtoMapper: UserDtoMapper,
    clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string
  ) {
    this.client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  static create(
    userRepoReader: UserRepoReaderInterface,
    userRepoWriter: UserRepoWriterInterface,
    externalLoginRepo: ExternalLoginRepoInterface,
    userDtoMapper: UserDtoMapper,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ) {
    return new GoogleLoginUseCase(userRepoReader, userRepoWriter, externalLoginRepo, userDtoMapper, clientId, clientSecret, redirectUri);
  }

  async execute(code: string): Promise<UserDtoForSelf> {
    const { tokens } = await this.client.getToken(code);
    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) throwAppError("Invalid Google token payload", 400, "GoogleLoginUseCase");

    const { sub: googleId, email, name } = payload;
    if (!email) throwAppError("Google account must have an email", 400, "GoogleLoginUseCase");

    let userId = await this.externalLoginRepo.findByProviderAndExternalId('google', googleId);

    if (!userId) {
      let user = await this.userRepoReader.getUserByEmail(email);
      if (!user) {
        // Create new user
        await this.userRepoWriter.createUser({
          name: name || email.split('@')[0],
          email: email,
          password_hashed: '', // Empty password for OAuth users
          last_password: ''
        });
        user = await this.userRepoReader.getUserByEmail(email);
        if (!user) throwAppError("Failed to create user", 500, "GoogleLoginUseCase");
        await this.userRepoWriter.markUserAsVerified(user.id);
        user.markAsVerified();
      }
      
      await this.externalLoginRepo.create(user.id, 'google', googleId);
      userId = user.id;
    }

    const user = await this.userRepoReader.getUserById(userId!);
    if (!user) throwAppError("User not found", 404, "GoogleLoginUseCase");
    user.canLogin();

    return this.userDtoMapper.mapToUserDto(user);
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add src/modules/authentification/usecases/auth.google_login.usecase.ts
git commit -m "feat: add Google login use case"
```

---

### Task 5: Backend Controller & Integration

**Files:**
- Create: `src/modules/authentification/controllers/controller.google_login.ts`
- Modify: `src/modules/authentification/auth_service.ts`
- Modify: `src/container.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Create Google Login Controller**
```typescript
import { Request, Response } from "express";
import { AuthentificationService } from "../auth_service";
import { z } from "zod";

export const GoogleLoginBodySchema = z.object({
  code: z.string(),
});

export class ControllerGoogleLogin {
  constructor(private readonly authService: AuthentificationService) {}

  static create(authService: AuthentificationService) {
    return new ControllerGoogleLogin(authService);
  }

  googleLoginCont = async (req: Request, res: Response) => {
    const { code } = req.body;
    const result = await this.authService.loginGoogle(code);
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ user: result.loggedUser, accessToken: result.accessToken });
  };
}
```

- [ ] **Step 2: Update AuthentificationService**
Add `loginGoogle` method.
```typescript
// ... inside AuthentificationService class
    async loginGoogle(code: string): Promise<{refreshToken: string, accessToken: string, loggedUser: UserDtoForSelf}> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoReader = RepositoryUserReader.create(client);
            const userRepoWriter = RepositoryUserWriter.create(client);
            const externalLoginRepo = RepositoryUserExternalLogin.create(client);
            const userDtoMapper = this.userDtoMapper;
            const refreshTokenRepo = JwtRefreshTokenRepository.create(client);

            const googleLoginUseCase = GoogleLoginUseCase.create(
                userRepoReader,
                userRepoWriter,
                externalLoginRepo,
                userDtoMapper,
                process.env.GOOGLE_CLIENT_ID!,
                process.env.GOOGLE_CLIENT_SECRET!,
                process.env.GOOGLE_REDIRECT_URI!
            );

            const loggedUser = await googleLoginUseCase.execute(code);
            const tokens = await this.generateTokens(loggedUser.id, refreshTokenRepo);

            return {loggedUser, ...tokens};
        })
    }
```

- [ ] **Step 3: Update Container and App for routing**
Register `controllerGoogleLogin` in `DepsContainer` and add route in `createApp`.

- [ ] **Step 4: Commit**
```bash
git add src/modules/authentification/controllers/controller.google_login.ts src/modules/authentification/auth_service.ts src/container.ts src/app.ts
git commit -m "feat: integrate Google login controller and routing"
```

---

### Task 6: Frontend Integration

**Files:**
- Modify: `frontend/src/api/auth.ts`
- Modify: `frontend/src/main.ts`
- Modify: `frontend/src/views/LoginView.vue`

- [ ] **Step 1: Add googleLogin to API**
```typescript
export async function googleLogin(code: string): Promise<AuthResponse> {
  return call(async () => {
    const { data } = await publicApi.post<AuthResponse>('/pub/auth/google', { code })
    return data
  })
}
```

- [ ] **Step 2: Initialize Google Sign-In in main.ts**
```typescript
import GoogleSignInPlugin from 'vue3-google-signin'

app.use(GoogleSignInPlugin, {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
})
```

- [ ] **Step 3: Add Google Login button to LoginView.vue**
Use `useTokenClient` or `GoogleLogin` component to trigger the flow and call `googleLogin(code)`.

- [ ] **Step 4: Commit**
```bash
git add frontend/src/api/auth.ts frontend/src/main.ts frontend/src/views/LoginView.vue
git commit -m "feat: add Google login button and integration to frontend"
```
