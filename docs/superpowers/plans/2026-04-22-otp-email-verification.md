# OTP Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6-digit numeric OTP email verification to registration, forgot-password reset, email change, and account deletion flows.

**Architecture:** New `token` module owns the full OTP lifecycle (entity, interfaces, repositories, two use cases). User domain use cases compose with token use cases via constructor injection, following the existing Reader/Writer repository split and `static create()` factory pattern. OTPs are hashed with SHA-256 (not bcrypt) and expire in 15 minutes.

**Tech Stack:** PostgreSQL (`pg`), nodemailer (SMTP), Node.js built-in `crypto` (OTP generation + SHA-256), Jest (testing)

---

## File Map

**New source files:**
- `src/modules/token/entity/token.ts` — `OtpToken` class + `TokenPurpose` enum
- `src/modules/token/interfaces/interface.repository.ts` — `TokenRepoReaderInterface`, `TokenRepoWriterInterface`
- `src/modules/token/repository/repository.token.reader.ts`
- `src/modules/token/repository/repository.token.writer.ts`
- `src/modules/token/usecases/token.create_otp.usecase.ts`
- `src/modules/token/usecases/token.verify_otp.usecase.ts`
- `src/modules/infra/email/infra.email_sender.interface.ts`
- `src/modules/infra/email/infra.email_nodemailer.implementation.ts`
- `src/modules/user/usecases/user.request_registration_verification.usecase.ts`
- `src/modules/user/usecases/user.confirm_registration.usecase.ts`
- `src/modules/user/usecases/user.request_password_reset.usecase.ts`
- `src/modules/user/usecases/user.confirm_password_reset.usecase.ts`
- `src/modules/user/usecases/user.request_email_change.usecase.ts`
- `src/modules/user/usecases/user.confirm_email_change.usecase.ts`
- `src/modules/user/usecases/user.confirm_account_deletion.usecase.ts`

**Renamed source files:**
- `src/modules/user/usecases/user.delete_user.usecase.ts` → `src/modules/user/usecases/user.request_account_deletion.usecase.ts` (class renamed, logic changed)

**Modified source files:**
- `src/modules/user/entity/user.ts` — add `pending_email`, `updatePendingEmail()`, `resetPassword()`; update `restoreUser()` + constructor
- `src/modules/user/repository/repository.user.reader.ts` — pass `pending_email` in `restoreHelper`
- `src/modules/user/repository/repository.user.writer.ts` — include `pending_email` in `updateUser` SQL
- `src/container.ts` — wire all new dependencies

**New test files:**
- `tests/modules/token/entity/token.test.ts`
- `tests/modules/token/usecases/token.create_otp.usecase.test.ts`
- `tests/modules/token/usecases/token.verify_otp.usecase.test.ts`
- `tests/modules/token/repository/repository.token.reader.test.ts`
- `tests/modules/token/repository/repository.token.writer.test.ts`
- `tests/modules/user/usecases/user.request_registration_verification.usecase.test.ts`
- `tests/modules/user/usecases/user.confirm_registration.usecase.test.ts`
- `tests/modules/user/usecases/user.request_password_reset.usecase.test.ts`
- `tests/modules/user/usecases/user.confirm_password_reset.usecase.test.ts`
- `tests/modules/user/usecases/user.request_email_change.usecase.test.ts`
- `tests/modules/user/usecases/user.confirm_email_change.usecase.test.ts`
- `tests/modules/user/usecases/user.request_account_deletion.usecase.test.ts`
- `tests/modules/user/usecases/user.confirm_account_deletion.usecase.test.ts`

**Modified test files:**
- `tests/modules/user/entity/user.test.ts` — add `pending_email` to `restoreUser` calls + new method tests
- `tests/modules/user/usecases/user.change_password.usecase.test.ts` — add `null` for `pending_email` to `restoreUser` call
- `tests/modules/user/usecases/user.update_name.usecase.test.ts` — same
- `tests/modules/user/usecases/user.delete_user.usecase.test.ts` — delete this file (replaced by request_account_deletion test)
- `tests/modules/user/repository/repository.user.writer.test.ts` — add `pending_email` to `restoreUser` calls

**New migration files:**
- `migrations/1776872210000_add-pending-email-column.ts`
- `migrations/1776872220000_create-verification-tokens-table.ts`

---

## Task 1: Install nodemailer

**Files:** `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

- [ ] **Step 2: Verify install**

```bash
grep nodemailer package.json
```

Expected: `"nodemailer"` appears under `dependencies` and `"@types/nodemailer"` under `devDependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add nodemailer dependency"
```

---

## Task 2: Database migrations

**Files:**
- Create: `migrations/1776872210000_add-pending-email-column.ts`
- Create: `migrations/1776872220000_create-verification-tokens-table.ts`

- [ ] **Step 1: Create pending_email migration**

```typescript
// migrations/1776872210000_add-pending-email-column.ts
import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.addColumn('users', {
        pending_email: {
            type: 'varchar(255)',
            notNull: false,
            default: null,
        }
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropColumn('users', 'pending_email');
}
```

- [ ] **Step 2: Create verification_tokens migration**

```typescript
// migrations/1776872220000_create-verification-tokens-table.ts
import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('verification_tokens', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE',
        },
        otp_hash: {
            type: 'varchar(255)',
            notNull: true,
        },
        purpose: {
            type: 'varchar(50)',
            notNull: true,
        },
        expires_at: {
            type: 'timestamptz',
            notNull: true,
        },
        is_used: {
            type: 'boolean',
            notNull: true,
            default: false,
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });
    pgm.sql('CREATE INDEX idx_verification_tokens_user_purpose ON verification_tokens (user_id, purpose)');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropIndex('verification_tokens', 'idx_verification_tokens_user_purpose');
    pgm.dropTable('verification_tokens');
}
```

- [ ] **Step 3: Run migrations**

```bash
npm run migrate up
```

Expected: Two migration success messages, no errors.

- [ ] **Step 4: Commit**

```bash
git add migrations/
git commit -m "feat(token): add pending_email column and verification_tokens table"
```

---

## Task 3: OtpToken entity + tests

**Files:**
- Create: `src/modules/token/entity/token.ts`
- Create: `tests/modules/token/entity/token.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/token/entity/token.test.ts
import { OtpToken, TokenPurpose } from '../../../../src/modules/token/entity/token';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('OtpToken Entity', () => {

    describe('generate()', () => {
        it('should return a 6-character numeric string', () => {
            const otp = OtpToken.generate();
            expect(otp).toMatch(/^\d{6}$/);
        });

        it('should produce different values on repeated calls (probabilistic)', () => {
            const results = new Set(Array.from({ length: 10 }, () => OtpToken.generate()));
            expect(results.size).toBeGreaterThan(1);
        });
    });

    describe('hash()', () => {
        it('should return the same hash for the same input', () => {
            expect(OtpToken.hash('123456')).toBe(OtpToken.hash('123456'));
        });

        it('should return different hashes for different inputs', () => {
            expect(OtpToken.hash('123456')).not.toBe(OtpToken.hash('654321'));
        });

        it('should return a non-empty string', () => {
            expect(OtpToken.hash('123456').length).toBeGreaterThan(0);
        });
    });

    describe('createForDatabase()', () => {
        it('should return correct shape with future expires_at', () => {
            const before = new Date();
            const data = OtpToken.createForDatabase('user-1', TokenPurpose.REGISTRATION, 'hash123', 15);
            const after = new Date();

            expect(data.user_id).toBe('user-1');
            expect(data.otp_hash).toBe('hash123');
            expect(data.purpose).toBe(TokenPurpose.REGISTRATION);
            expect(data.expires_at.getTime()).toBeGreaterThan(before.getTime() + 14 * 60 * 1000);
            expect(data.expires_at.getTime()).toBeLessThanOrEqual(after.getTime() + 15 * 60 * 1000 + 100);
        });
    });

    describe('isExpired()', () => {
        it('should return true for a past expires_at', () => {
            const token = new OtpToken('id', 'uid', 'hash', TokenPurpose.REGISTRATION, new Date(Date.now() - 1000), false, new Date());
            expect(token.isExpired()).toBe(true);
        });

        it('should return false for a future expires_at', () => {
            const token = new OtpToken('id', 'uid', 'hash', TokenPurpose.REGISTRATION, new Date(Date.now() + 60000), false, new Date());
            expect(token.isExpired()).toBe(false);
        });
    });

    describe('assertValid()', () => {
        it('should throw AppError 400 if token is used', () => {
            const token = new OtpToken('id', 'uid', 'hash', TokenPurpose.REGISTRATION, new Date(Date.now() + 60000), true, new Date());
            expect(() => token.assertValid()).toThrow(AppError);
            expect(() => token.assertValid()).toThrow(/already been used/);
        });

        it('should throw AppError 400 if token is expired', () => {
            const token = new OtpToken('id', 'uid', 'hash', TokenPurpose.REGISTRATION, new Date(Date.now() - 1000), false, new Date());
            expect(() => token.assertValid()).toThrow(AppError);
            expect(() => token.assertValid()).toThrow(/expired/);
        });

        it('should not throw for a valid token', () => {
            const token = new OtpToken('id', 'uid', 'hash', TokenPurpose.REGISTRATION, new Date(Date.now() + 60000), false, new Date());
            expect(() => token.assertValid()).not.toThrow();
        });
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/modules/token/entity/token.test.ts
```

Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implement OtpToken entity**

```typescript
// src/modules/token/entity/token.ts
import * as crypto from 'crypto';
import { throwAppError } from '../../errors/errors.global';

export enum TokenPurpose {
    REGISTRATION   = 'registration',
    RESET_PASSWORD = 'reset_password',
    CHANGE_EMAIL   = 'change_email',
    DELETE_ACCOUNT = 'delete_account',
}

export class OtpToken {
    constructor(
        public readonly id: string,
        public readonly user_id: string,
        public readonly otp_hash: string,
        public readonly purpose: TokenPurpose,
        public readonly expires_at: Date,
        public readonly is_used: boolean,
        public readonly created_at: Date,
    ) {}

    static generate(): string {
        return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    }

    static hash(plain: string): string {
        return crypto.createHash('sha256').update(plain).digest('hex');
    }

    static createForDatabase(
        userId: string,
        purpose: TokenPurpose,
        otpHash: string,
        ttlMinutes: number,
    ): { user_id: string; otp_hash: string; purpose: TokenPurpose; expires_at: Date } {
        const expires_at = new Date(Date.now() + ttlMinutes * 60 * 1000);
        return { user_id: userId, otp_hash: otpHash, purpose, expires_at };
    }

    isExpired(): boolean {
        return this.expires_at < new Date();
    }

    assertValid(): void {
        if (this.is_used) {
            throwAppError('Verification code has already been used.', 400, 'OtpToken.assertValid()');
        }
        if (this.isExpired()) {
            throwAppError('Verification code has expired.', 400, 'OtpToken.assertValid()');
        }
    }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest tests/modules/token/entity/token.test.ts
```

Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/token/entity/token.ts tests/modules/token/entity/token.test.ts
git commit -m "feat(token): add OtpToken entity with TokenPurpose enum"
```

---

## Task 4: Token repository interfaces

**Files:**
- Create: `src/modules/token/interfaces/interface.repository.ts`

- [ ] **Step 1: Create interface file**

```typescript
// src/modules/token/interfaces/interfaces.repository.ts
import { OtpToken, TokenPurpose } from '../entity/token';

export interface TokenRepoReaderInterface {
    getActiveToken(userId: string, purpose: TokenPurpose): Promise<OtpToken | null>;
}

export interface TokenRepoWriterInterface {
    createToken(data: { user_id: string; otp_hash: string; purpose: TokenPurpose; expires_at: Date }): Promise<void>;
    invalidatePreviousTokens(userId: string, purpose: TokenPurpose): Promise<void>;
    markTokenAsUsed(id: string): Promise<void>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/token/interfaces/interfaces.repository.ts
git commit -m "feat(token): add token repository interfaces"
```

---

## Task 5: Token repositories + integration tests

**Files:**
- Create: `src/modules/token/repository/repository.token.reader.ts`
- Create: `src/modules/token/repository/repository.token.writer.ts`
- Create: `tests/modules/token/repository/repository.token.reader.test.ts`
- Create: `tests/modules/token/repository/repository.token.writer.test.ts`

- [ ] **Step 1: Write failing reader integration test**

```typescript
// tests/modules/token/repository/repository.token.reader.test.ts
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryTokenReader } from '../../../../src/modules/token/repository/repository.token.reader';
import { OtpToken, TokenPurpose } from '../../../../src/modules/token/entity/token';

dotenv.config();

describe('RepositoryTokenReader Integration Test', () => {
    let pool: Pool;
    let reader: RepositoryTokenReader;
    let userId: string;

    beforeAll(async () => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        reader = new RepositoryTokenReader(pool);

        await pool.query('DELETE FROM verification_tokens');
        await pool.query('DELETE FROM users');

        const result = await pool.query(
            "INSERT INTO users (name, email, password_hashed, last_password, is_verified) VALUES ($1,$2,$3,$4,$5) RETURNING id",
            ['Token Test User', 'tokenreader@example.com', 'hash', 'hash', true]
        );
        userId = result.rows[0].id;

        // Active registration token
        await pool.query(
            "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1,$2,$3,$4)",
            [userId, 'active_hash', TokenPurpose.REGISTRATION, new Date(Date.now() + 15 * 60 * 1000)]
        );
        // Used reset_password token
        await pool.query(
            "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at, is_used) VALUES ($1,$2,$3,$4,$5)",
            [userId, 'used_hash', TokenPurpose.RESET_PASSWORD, new Date(Date.now() + 15 * 60 * 1000), true]
        );
        // Expired change_email token
        await pool.query(
            "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1,$2,$3,$4)",
            [userId, 'expired_hash', TokenPurpose.CHANGE_EMAIL, new Date(Date.now() - 1000)]
        );
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('getActiveToken', () => {
        it('should return an OtpToken for an active, non-expired token', async () => {
            const token = await reader.getActiveToken(userId, TokenPurpose.REGISTRATION);
            expect(token).toBeInstanceOf(OtpToken);
            expect(token?.user_id).toBe(userId);
            expect(token?.purpose).toBe(TokenPurpose.REGISTRATION);
            expect(token?.otp_hash).toBe('active_hash');
        });

        it('should return null for a used token', async () => {
            const token = await reader.getActiveToken(userId, TokenPurpose.RESET_PASSWORD);
            expect(token).toBeNull();
        });

        it('should return null for an expired token', async () => {
            const token = await reader.getActiveToken(userId, TokenPurpose.CHANGE_EMAIL);
            expect(token).toBeNull();
        });

        it('should return null for a purpose with no token', async () => {
            const token = await reader.getActiveToken(userId, TokenPurpose.DELETE_ACCOUNT);
            expect(token).toBeNull();
        });

        it('should return null for a non-existent user', async () => {
            const token = await reader.getActiveToken('00000000-0000-0000-0000-000000000000', TokenPurpose.REGISTRATION);
            expect(token).toBeNull();
        });
    });
});
```

- [ ] **Step 2: Write failing writer integration test**

```typescript
// tests/modules/token/repository/repository.token.writer.test.ts
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryTokenWriter } from '../../../../src/modules/token/repository/repository.token.writer';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';

dotenv.config();

describe('RepositoryTokenWriter Integration Test', () => {
    let pool: Pool;
    let writer: RepositoryTokenWriter;
    let userId: string;

    beforeAll(async () => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        writer = new RepositoryTokenWriter(pool);

        await pool.query('DELETE FROM verification_tokens');
        await pool.query('DELETE FROM users');

        const result = await pool.query(
            "INSERT INTO users (name, email, password_hashed, last_password, is_verified) VALUES ($1,$2,$3,$4,$5) RETURNING id",
            ['Token Writer User', 'tokenwriter@example.com', 'hash', 'hash', true]
        );
        userId = result.rows[0].id;
    });

    afterAll(async () => {
        await pool.end();
    });

    beforeEach(async () => {
        await pool.query('DELETE FROM verification_tokens');
    });

    describe('createToken', () => {
        it('should insert a row in verification_tokens', async () => {
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await writer.createToken({ user_id: userId, otp_hash: 'testhash', purpose: TokenPurpose.REGISTRATION, expires_at: expiresAt });

            const result = await pool.query('SELECT * FROM verification_tokens WHERE user_id = $1', [userId]);
            expect(result.rows.length).toBe(1);
            expect(result.rows[0].otp_hash).toBe('testhash');
            expect(result.rows[0].purpose).toBe(TokenPurpose.REGISTRATION);
            expect(result.rows[0].is_used).toBe(false);
        });
    });

    describe('invalidatePreviousTokens', () => {
        it('should mark all active tokens for user+purpose as used', async () => {
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await pool.query(
                "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1,$2,$3,$4),($1,$5,$3,$4)",
                [userId, 'hash1', TokenPurpose.REGISTRATION, expiresAt, 'hash2']
            );

            await writer.invalidatePreviousTokens(userId, TokenPurpose.REGISTRATION);

            const result = await pool.query('SELECT is_used FROM verification_tokens WHERE user_id = $1', [userId]);
            expect(result.rows.every((r: any) => r.is_used)).toBe(true);
        });

        it('should not affect tokens of a different purpose', async () => {
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await pool.query(
                "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1,$2,$3,$4)",
                [userId, 'keep_hash', TokenPurpose.DELETE_ACCOUNT, expiresAt]
            );

            await writer.invalidatePreviousTokens(userId, TokenPurpose.REGISTRATION);

            const result = await pool.query(
                "SELECT is_used FROM verification_tokens WHERE purpose = $1",
                [TokenPurpose.DELETE_ACCOUNT]
            );
            expect(result.rows[0].is_used).toBe(false);
        });
    });

    describe('markTokenAsUsed', () => {
        it('should set is_used = true for the given token id', async () => {
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            const insertResult = await pool.query(
                "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1,$2,$3,$4) RETURNING id",
                [userId, 'markhash', TokenPurpose.REGISTRATION, expiresAt]
            );
            const tokenId = insertResult.rows[0].id;

            await writer.markTokenAsUsed(tokenId);

            const result = await pool.query('SELECT is_used FROM verification_tokens WHERE id = $1', [tokenId]);
            expect(result.rows[0].is_used).toBe(true);
        });
    });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx jest tests/modules/token/repository/
```

Expected: FAIL — `Cannot find module`.

- [ ] **Step 4: Implement token reader**

```typescript
// src/modules/token/repository/repository.token.reader.ts
import { Pool, PoolClient } from 'pg';
import { OtpToken, TokenPurpose } from '../entity/token';
import { TokenRepoReaderInterface } from '../interfaces/interfaces.repository';
import { handleDatabaseError } from '../../errors/mapper.database';

export class RepositoryTokenReader implements TokenRepoReaderInterface {
    private moduleName = 'RepositoryTokenReader';

    constructor(private readonly db: Pool | PoolClient) {}

    static create(db: Pool | PoolClient): RepositoryTokenReader {
        return new RepositoryTokenReader(db);
    }

    private restoreHelper(row: any): OtpToken {
        return new OtpToken(
            row.id,
            row.user_id,
            row.otp_hash,
            row.purpose as TokenPurpose,
            row.expires_at,
            row.is_used,
            row.created_at,
        );
    }

    async getActiveToken(userId: string, purpose: TokenPurpose): Promise<OtpToken | null> {
        try {
            const result = await this.db.query(
                `SELECT * FROM verification_tokens
                 WHERE user_id = $1 AND purpose = $2 AND is_used = false AND expires_at > now()
                 ORDER BY created_at DESC LIMIT 1`,
                [userId, purpose],
            );
            const row = result.rows[0];
            if (!row) return null;
            return this.restoreHelper(row);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getActiveToken`);
        }
    }
}
```

- [ ] **Step 5: Implement token writer**

```typescript
// src/modules/token/repository/repository.token.writer.ts
import { Pool, PoolClient } from 'pg';
import { TokenPurpose } from '../entity/token';
import { TokenRepoWriterInterface } from '../interfaces/interfaces.repository';
import { handleDatabaseError } from '../../errors/mapper.database';

export class RepositoryTokenWriter implements TokenRepoWriterInterface {
    private moduleName = 'RepositoryTokenWriter';

    constructor(private readonly db: Pool | PoolClient) {}

    static create(db: Pool | PoolClient): RepositoryTokenWriter {
        return new RepositoryTokenWriter(db);
    }

    async createToken(data: { user_id: string; otp_hash: string; purpose: TokenPurpose; expires_at: Date }): Promise<void> {
        try {
            await this.db.query(
                'INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)',
                [data.user_id, data.otp_hash, data.purpose, data.expires_at],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.createToken`);
        }
    }

    async invalidatePreviousTokens(userId: string, purpose: TokenPurpose): Promise<void> {
        try {
            await this.db.query(
                'UPDATE verification_tokens SET is_used = true WHERE user_id = $1 AND purpose = $2 AND is_used = false',
                [userId, purpose],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.invalidatePreviousTokens`);
        }
    }

    async markTokenAsUsed(id: string): Promise<void> {
        try {
            await this.db.query('UPDATE verification_tokens SET is_used = true WHERE id = $1', [id]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.markTokenAsUsed`);
        }
    }
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx jest tests/modules/token/repository/
```

Expected: PASS — all 7 tests green.

- [ ] **Step 7: Commit**

```bash
git add src/modules/token/repository/ tests/modules/token/repository/
git commit -m "feat(token): add token reader and writer repositories"
```

---

## Task 6: Email infrastructure

**Files:**
- Create: `src/modules/infra/email/infra.email_sender.interface.ts`
- Create: `src/modules/infra/email/infra.email_nodemailer.implementation.ts`

- [ ] **Step 1: Create email sender interface**

```typescript
// src/modules/infra/email/infra.email_sender.interfaces.ts
export interface InfraEmailSenderInterface {
    sendRegistrationOtp(to: string, otp: string): Promise<void>;
    sendPasswordResetOtp(to: string, otp: string): Promise<void>;
    sendEmailChangeOtp(to: string, otp: string): Promise<void>;
    sendAccountDeletionOtp(to: string, otp: string): Promise<void>;
}
```

- [ ] **Step 2: Implement nodemailer email sender**

```typescript
// src/modules/infra/email/infra.email_nodemailer.implementation.ts
import * as nodemailer from 'nodemailer';
import { InfraEmailSenderInterface } from './infra.email_sender.interfaces';

export class InfraEmailNodemailerImplementation implements InfraEmailSenderInterface {
    private transporter: nodemailer.Transporter;

    constructor(
        private readonly host: string,
        private readonly port: number,
        private readonly user: string,
        private readonly pass: string,
    ) {
        this.transporter = nodemailer.createTransport({
            host: this.host,
            port: this.port,
            auth: { user: this.user, pass: this.pass },
        });
    }

    static create(host: string, port: number, user: string, pass: string): InfraEmailNodemailerImplementation {
        return new InfraEmailNodemailerImplementation(host, port, user, pass);
    }

    private async send(to: string, subject: string, text: string): Promise<void> {
        await this.transporter.sendMail({ from: this.user, to, subject, text });
    }

    async sendRegistrationOtp(to: string, otp: string): Promise<void> {
        await this.send(to, 'Verify your email', `Your verification code is: ${otp}\n\nIt expires in 15 minutes.`);
    }

    async sendPasswordResetOtp(to: string, otp: string): Promise<void> {
        await this.send(to, 'Reset your password', `Your password reset code is: ${otp}\n\nIt expires in 15 minutes.`);
    }

    async sendEmailChangeOtp(to: string, otp: string): Promise<void> {
        await this.send(to, 'Verify your new email', `Your email change verification code is: ${otp}\n\nIt expires in 15 minutes.`);
    }

    async sendAccountDeletionOtp(to: string, otp: string): Promise<void> {
        await this.send(to, 'Confirm account deletion', `Your account deletion code is: ${otp}\n\nIt expires in 15 minutes.`);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/infra/email/
git commit -m "feat(infra): add email sender interface and nodemailer implementation"
```

---

## Task 7: CreateOtpUseCase + tests

**Files:**
- Create: `src/modules/token/usecases/token.create_otp.usecase.ts`
- Create: `tests/modules/token/usecases/token.create_otp.usecase.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/token/usecases/token.create_otp.usecase.test.ts
import { CreateOtpUseCase } from '../../../../src/modules/token/usecases/token.create_otp.usecase';
import { TokenRepoWriterInterface } from '../../../../src/modules/token/interfaces/interfaces.repository';
import { InfraEmailSenderInterface } from '../../../../src/modules/infra/email/infra.email_sender.interfaces';
import { OtpToken, TokenPurpose } from '../../../../src/modules/token/entity/token';

describe('CreateOtpUseCase Unit Tests', () => {
    let mockTokenWriter: jest.Mocked<TokenRepoWriterInterface>;
    let mockEmailSender: jest.Mocked<InfraEmailSenderInterface>;
    let useCase: CreateOtpUseCase;

    beforeEach(() => {
        jest.spyOn(OtpToken, 'generate').mockReturnValue('123456');
        jest.spyOn(OtpToken, 'hash').mockImplementation((plain) => `sha256:${plain}`);

        mockTokenWriter = {
            createToken: jest.fn().mockResolvedValue(undefined),
            invalidatePreviousTokens: jest.fn().mockResolvedValue(undefined),
            markTokenAsUsed: jest.fn().mockResolvedValue(undefined),
        };
        mockEmailSender = {
            sendRegistrationOtp: jest.fn().mockResolvedValue(undefined),
            sendPasswordResetOtp: jest.fn().mockResolvedValue(undefined),
            sendEmailChangeOtp: jest.fn().mockResolvedValue(undefined),
            sendAccountDeletionOtp: jest.fn().mockResolvedValue(undefined),
        };
        useCase = new CreateOtpUseCase(mockTokenWriter, mockEmailSender);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should invalidate previous tokens before creating a new one', async () => {
        await useCase.execute('user-1', 'user@example.com', TokenPurpose.REGISTRATION);
        expect(mockTokenWriter.invalidatePreviousTokens).toHaveBeenCalledWith('user-1', TokenPurpose.REGISTRATION);
        const invalidateOrder = mockTokenWriter.invalidatePreviousTokens.mock.invocationCallOrder[0];
        const createOrder = mockTokenWriter.createToken.mock.invocationCallOrder[0];
        expect(invalidateOrder).toBeLessThan(createOrder);
    });

    it('should create a token with correct user_id, purpose, and hashed OTP', async () => {
        await useCase.execute('user-1', 'user@example.com', TokenPurpose.REGISTRATION);
        expect(mockTokenWriter.createToken).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-1',
                purpose: TokenPurpose.REGISTRATION,
                otp_hash: 'sha256:123456',
            }),
        );
    });

    it('should send registration email for REGISTRATION purpose', async () => {
        await useCase.execute('user-1', 'user@example.com', TokenPurpose.REGISTRATION);
        expect(mockEmailSender.sendRegistrationOtp).toHaveBeenCalledWith('user@example.com', '123456');
    });

    it('should send password reset email for RESET_PASSWORD purpose', async () => {
        await useCase.execute('user-1', 'user@example.com', TokenPurpose.RESET_PASSWORD);
        expect(mockEmailSender.sendPasswordResetOtp).toHaveBeenCalledWith('user@example.com', '123456');
    });

    it('should send email change email for CHANGE_EMAIL purpose', async () => {
        await useCase.execute('user-1', 'newemail@example.com', TokenPurpose.CHANGE_EMAIL);
        expect(mockEmailSender.sendEmailChangeOtp).toHaveBeenCalledWith('newemail@example.com', '123456');
    });

    it('should send account deletion email for DELETE_ACCOUNT purpose', async () => {
        await useCase.execute('user-1', 'user@example.com', TokenPurpose.DELETE_ACCOUNT);
        expect(mockEmailSender.sendAccountDeletionOtp).toHaveBeenCalledWith('user@example.com', '123456');
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/modules/token/usecases/token.create_otp.usecase.test.ts
```

Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implement CreateOtpUseCase**

```typescript
// src/modules/token/usecases/token.create_otp.usecase.ts
import { OtpToken, TokenPurpose } from '../entity/token';
import { TokenRepoWriterInterface } from '../interfaces/interfaces.repository';
import { InfraEmailSenderInterface } from '../../infra/email/infra.email_sender.interfaces';

export class CreateOtpUseCase {
    private moduleName = 'CreateOtpUseCase';

    constructor(
        private readonly tokenRepoWriter: TokenRepoWriterInterface,
        private readonly emailSender: InfraEmailSenderInterface,
    ) {}

    static create(tokenRepoWriter: TokenRepoWriterInterface, emailSender: InfraEmailSenderInterface): CreateOtpUseCase {
        return new CreateOtpUseCase(tokenRepoWriter, emailSender);
    }

    private async sendEmail(purpose: TokenPurpose, to: string, otp: string): Promise<void> {
        switch (purpose) {
            case TokenPurpose.REGISTRATION:
                return this.emailSender.sendRegistrationOtp(to, otp);
            case TokenPurpose.RESET_PASSWORD:
                return this.emailSender.sendPasswordResetOtp(to, otp);
            case TokenPurpose.CHANGE_EMAIL:
                return this.emailSender.sendEmailChangeOtp(to, otp);
            case TokenPurpose.DELETE_ACCOUNT:
                return this.emailSender.sendAccountDeletionOtp(to, otp);
        }
    }

    async execute(userId: string, recipientEmail: string, purpose: TokenPurpose): Promise<void> {
        await this.tokenRepoWriter.invalidatePreviousTokens(userId, purpose);

        const plain = OtpToken.generate();
        const otpHash = OtpToken.hash(plain);
        const tokenData = OtpToken.createForDatabase(userId, purpose, otpHash, 15);

        await this.tokenRepoWriter.createToken(tokenData);
        await this.sendEmail(purpose, recipientEmail, plain);
    }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest tests/modules/token/usecases/token.create_otp.usecase.test.ts
```

Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/token/usecases/token.create_otp.usecase.ts tests/modules/token/usecases/token.create_otp.usecase.test.ts
git commit -m "feat(token): add CreateOtpUseCase"
```

---

## Task 8: VerifyOtpUseCase + tests

**Files:**
- Create: `src/modules/token/usecases/token.verify_otp.usecase.ts`
- Create: `tests/modules/token/usecases/token.verify_otp.usecase.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/token/usecases/token.verify_otp.usecase.test.ts
import { VerifyOtpUseCase } from '../../../../src/modules/token/usecases/token.verify_otp.usecase';
import { TokenRepoReaderInterface, TokenRepoWriterInterface } from '../../../../src/modules/token/interfaces/interfaces.repository';
import { OtpToken, TokenPurpose } from '../../../../src/modules/token/entity/token';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('VerifyOtpUseCase Unit Tests', () => {
    let mockTokenReader: jest.Mocked<TokenRepoReaderInterface>;
    let mockTokenWriter: jest.Mocked<TokenRepoWriterInterface>;
    let useCase: VerifyOtpUseCase;

    const makeToken = (overrides: Partial<{ is_used: boolean; expires_at: Date }> = {}): OtpToken =>
        new OtpToken(
            'token-id',
            'user-1',
            OtpToken.hash('123456'),
            TokenPurpose.REGISTRATION,
            overrides.expires_at ?? new Date(Date.now() + 60000),
            overrides.is_used ?? false,
            new Date(),
        );

    beforeEach(() => {
        mockTokenReader = { getActiveToken: jest.fn() };
        mockTokenWriter = {
            createToken: jest.fn(),
            invalidatePreviousTokens: jest.fn(),
            markTokenAsUsed: jest.fn().mockResolvedValue(undefined),
        };
        useCase = new VerifyOtpUseCase(mockTokenReader, mockTokenWriter);
    });

    it('should throw 400 if no active token is found', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(null);
        await expect(useCase.execute('user-1', TokenPurpose.REGISTRATION, '123456'))
            .rejects.toThrow(/No active verification code/);
    });

    it('should throw 400 if token is already used', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(makeToken({ is_used: true }));
        await expect(useCase.execute('user-1', TokenPurpose.REGISTRATION, '123456'))
            .rejects.toThrow(/already been used/);
    });

    it('should throw 400 if token is expired', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(makeToken({ expires_at: new Date(Date.now() - 1000) }));
        await expect(useCase.execute('user-1', TokenPurpose.REGISTRATION, '123456'))
            .rejects.toThrow(/expired/);
    });

    it('should throw 400 if OTP hash does not match', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(makeToken());
        await expect(useCase.execute('user-1', TokenPurpose.REGISTRATION, '000000'))
            .rejects.toThrow(/Invalid or expired verification code/);
    });

    it('should mark token as used on success', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(makeToken());
        await useCase.execute('user-1', TokenPurpose.REGISTRATION, '123456');
        expect(mockTokenWriter.markTokenAsUsed).toHaveBeenCalledWith('token-id');
    });

    it('should resolve without throwing for valid OTP', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(makeToken());
        await expect(useCase.execute('user-1', TokenPurpose.REGISTRATION, '123456')).resolves.toBeUndefined();
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/modules/token/usecases/token.verify_otp.usecase.test.ts
```

Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implement VerifyOtpUseCase**

```typescript
// src/modules/token/usecases/token.verify_otp.usecase.ts
import { OtpToken, TokenPurpose } from '../entity/token';
import { TokenRepoReaderInterface, TokenRepoWriterInterface } from '../interfaces/interfaces.repository';
import { throwAppError } from '../../errors/errors.global';

export class VerifyOtpUseCase {
    private moduleName = 'VerifyOtpUseCase';

    constructor(
        private readonly tokenRepoReader: TokenRepoReaderInterface,
        private readonly tokenRepoWriter: TokenRepoWriterInterface,
    ) {}

    static create(tokenRepoReader: TokenRepoReaderInterface, tokenRepoWriter: TokenRepoWriterInterface): VerifyOtpUseCase {
        return new VerifyOtpUseCase(tokenRepoReader, tokenRepoWriter);
    }

    async execute(userId: string, purpose: TokenPurpose, plainOtp: string): Promise<void> {
        const token = await this.tokenRepoReader.getActiveToken(userId, purpose);

        if (!token) {
            throwAppError('No active verification code found.', 400, `${this.moduleName}.execute()`);
        }

        token.assertValid();

        if (OtpToken.hash(plainOtp) !== token.otp_hash) {
            throwAppError('Invalid or expired verification code.', 400, `${this.moduleName}.execute()`);
        }

        await this.tokenRepoWriter.markTokenAsUsed(token.id);
    }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest tests/modules/token/usecases/token.verify_otp.usecase.test.ts
```

Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/token/usecases/token.verify_otp.usecase.ts tests/modules/token/usecases/token.verify_otp.usecase.test.ts
git commit -m "feat(token): add VerifyOtpUseCase"
```

---

## Task 9: User entity changes + fix existing tests

**Files:**
- Modify: `src/modules/user/entity/user.ts`
- Modify: `tests/modules/user/entity/user.test.ts`
- Modify: `tests/modules/user/usecases/user.change_password.usecase.test.ts`
- Modify: `tests/modules/user/usecases/user.update_name.usecase.test.ts`
- Modify: `tests/modules/user/usecases/user.delete_user.usecase.test.ts`
- Modify: `tests/modules/user/repository/repository.user.writer.test.ts`

- [ ] **Step 1: Add new entity tests for pending_email and resetPassword**

In `tests/modules/user/entity/user.test.ts`, add `pending_email: null as string | null` to the `validUserProps` object, add it as the 11th arg to every `User.restoreUser(...)` call inside `createValidUser`, and append these two `describe` blocks at the end of the outer `describe`:

```typescript
// Add to validUserProps:
pending_email: null as string | null,

// Update createValidUser to pass pending_email:
return User.restoreUser(
    props.id, props.name, props.email, props.password_hashed,
    props.created_at, props.updated_at, props.is_deleted,
    props.is_verified, props.last_password, props.pending_password,
    props.pending_email   // ← add this line
);

// Append these describe blocks:
describe('updatePendingEmail()', () => {
    it('should set pending_email to a valid email', () => {
        const user = createValidUser();
        user.updatePendingEmail('new@example.com');
        expect(user.pending_email).toBe('new@example.com');
    });

    it('should set pending_email to null', () => {
        const user = createValidUser({ pending_email: 'old@example.com' });
        user.updatePendingEmail(null);
        expect(user.pending_email).toBeNull();
    });

    it('should throw AppError for invalid email format', () => {
        const user = createValidUser();
        expect(() => user.updatePendingEmail('not-an-email')).toThrow(AppError);
    });

    it('should throw AppError if user is deleted', () => {
        const user = createValidUser({ is_deleted: true });
        expect(() => user.updatePendingEmail('new@example.com')).toThrow(/already deleted/);
    });

    it('should throw AppError if user is not verified', () => {
        const user = createValidUser({ is_verified: false });
        expect(() => user.updatePendingEmail('new@example.com')).toThrow(/not verified/);
    });
});

describe('resetPassword()', () => {
    it('should update password_hashed and last_password', () => {
        const user = createValidUser();
        user.resetPassword('new_hashed_value');
        expect(user.password_hashed).toBe('new_hashed_value');
        expect(user.last_password).toBe('new_hashed_value');
    });

    it('should work even when user is not verified', () => {
        const user = createValidUser({ is_verified: false });
        expect(() => user.resetPassword('new_hashed_value')).not.toThrow();
        expect(user.password_hashed).toBe('new_hashed_value');
    });

    it('should work even when user is deleted', () => {
        const user = createValidUser({ is_deleted: true });
        expect(() => user.resetPassword('new_hashed_value')).not.toThrow();
    });
});
```

- [ ] **Step 2: Run entity tests to confirm they fail**

```bash
npx jest tests/modules/user/entity/user.test.ts
```

Expected: FAIL — TypeScript errors on `restoreUser` arg count, unknown methods.

- [ ] **Step 3: Update user.ts — add pending_email, updatePendingEmail, resetPassword**

Replace the full content of `src/modules/user/entity/user.ts`:

```typescript
import {UserValidator} from "./user.validator";
import {throwAppError} from "../../errors/errors.global";

export class User {
    private moduleName = "UserDomain";
    constructor
    (
        public id: string,
        public name: string,
        public email: string,
        public password_hashed: string,
        public created_at: Date,
        public updated_at: Date,
        public is_deleted: boolean,
        public is_verified: boolean,
        public last_password: string,
        public pending_password: string | null,
        public pending_email: string | null,
    ) {
    }

    static createForDatabase
    (
        name: string,
        email: string,
        password_hashed: string,
    ): {name: string, email: string, password_hashed: string, last_password: string} {
        return {
            name,
            email,
            password_hashed,
            last_password: password_hashed,
        }
    }

    static restoreUser
    (
        id: string,
        name: string,
        email: string,
        password_hashed: string,
        created_at: Date,
        updated_at: Date,
        is_deleted: boolean,
        is_verified: boolean,
        last_password: string,
        pending_password: string | null,
        pending_email: string | null,
    ): User {
        UserValidator.validateName(name);
        UserValidator.validateEmail(email);
        return new User (
            id,
            name,
            email,
            password_hashed,
            created_at,
            updated_at,
            is_deleted,
            is_verified,
            last_password,
            pending_password,
            pending_email,
        )
    }

    private ensureActiveAndVerified(operation: string): void {
        if (this.is_deleted) {
            throwAppError(
                "User already deleted.",
                400,
                `${this.moduleName}.${operation}`,
            );
        }
        if (!this.is_verified) {
            throwAppError(
                "User is not verified.",
                400,
                `${this.moduleName}.${operation}`,
            );
        }
    }

    checkIfVerified(): boolean {
        return this.is_verified;
    }

    checkIfDeleted(): boolean {
        return this.is_deleted;
    }

    updateName(name: string): void {
        UserValidator.validateName(name);
        this.ensureActiveAndVerified("updateName()");
        this.name = name;
    }

    updateEmail(email: string): void {
        UserValidator.validateEmail(email);
        this.ensureActiveAndVerified("updateEmail()");
        this.email = email;
    }

    updatePassword(password_hashed: string): void {
        this.ensureActiveAndVerified("updatePassword()");
        this.password_hashed = password_hashed;
    }

    updateLastPassword(last_password: string): void {
        this.ensureActiveAndVerified("updateLastPassword()");
        this.last_password = last_password;
    }

    updatePendingPassword(pending_password: string | null): void {
        this.ensureActiveAndVerified("updatePendingPassword()");
        this.pending_password = pending_password;
    }

    updatePendingEmail(email: string | null): void {
        this.ensureActiveAndVerified("updatePendingEmail()");
        if (email !== null) {
            UserValidator.validateEmail(email);
        }
        this.pending_email = email;
    }

    resetPassword(hash: string): void {
        this.password_hashed = hash;
        this.last_password = hash;
    }

    assertDelete(): void {
        if (this.checkIfDeleted()) {
            throwAppError(
                "User already deleted.",
                400,
                `${this.moduleName}.delete()`,
            );
        }
    }
}
```

- [ ] **Step 4: Fix restoreUser call in user.change_password.usecase.test.ts**

In `tests/modules/user/usecases/user.change_password.usecase.test.ts`, find:
```typescript
const validUser = User.restoreUser(
    "uuid-1",
    "John Doe",
    "test@example.com",
    "old_hashed",
    new Date(),
    new Date(),
    false,
    true,
    "old_hashed",
    null
);
```
Add `null` as the 11th argument:
```typescript
const validUser = User.restoreUser(
    "uuid-1",
    "John Doe",
    "test@example.com",
    "old_hashed",
    new Date(),
    new Date(),
    false,
    true,
    "old_hashed",
    null,
    null
);
```

- [ ] **Step 5: Fix restoreUser call in user.update_name.usecase.test.ts**

In `tests/modules/user/usecases/user.update_name.usecase.test.ts`, find:
```typescript
const validUser = User.restoreUser(
    "uuid-1",
    "Old Name",
    "test@example.com",
    "hashed",
    new Date(),
    new Date(),
    false,
    true,
    "hashed",
    null
);
```
Add `null` as the 11th argument:
```typescript
const validUser = User.restoreUser(
    "uuid-1",
    "Old Name",
    "test@example.com",
    "hashed",
    new Date(),
    new Date(),
    false,
    true,
    "hashed",
    null,
    null
);
```

- [ ] **Step 6: Fix restoreUser call in user.delete_user.usecase.test.ts**

In `tests/modules/user/usecases/user.delete_user.usecase.test.ts`, find:
```typescript
const createValidUser = (deleted = false) => User.restoreUser(
    "uuid-1",
    "John Doe",
    "test@example.com",
    "hashed",
    new Date(),
    new Date(),
    deleted,
    true,
    "hashed",
    null
);
```
Add `null` as the 11th argument:
```typescript
const createValidUser = (deleted = false) => User.restoreUser(
    "uuid-1",
    "John Doe",
    "test@example.com",
    "hashed",
    new Date(),
    new Date(),
    deleted,
    true,
    "hashed",
    null,
    null
);
```

- [ ] **Step 7: Fix restoreUser calls in repository.user.writer.test.ts**

In `tests/modules/user/repository/repository.user.writer.test.ts`, find two `User.restoreUser` calls and add `null` as the last argument to each:

```typescript
// Line ~78 (updateUser test — restoring from DB row):
const user = User.restoreUser(
    row.id,
    row.name,
    row.email,
    row.password_hashed,
    row.created_at,
    row.updated_at,
    row.is_deleted,
    row.is_verified,
    row.last_password,
    row.pending_password,
    row.pending_email   // ← add
);

// Line ~148 (error handling test):
const user = User.restoreUser('id', 'name', 'e@e.com', 'p', new Date(), new Date(), false, true, 'p', null, null);
```

- [ ] **Step 8: Run all user entity and use case tests**

```bash
npx jest tests/modules/user/entity/ tests/modules/user/usecases/
```

Expected: PASS — all existing tests green plus new entity tests.

- [ ] **Step 9: Commit**

```bash
git add src/modules/user/entity/user.ts \
        tests/modules/user/entity/user.test.ts \
        tests/modules/user/usecases/user.change_password.usecase.test.ts \
        tests/modules/user/usecases/user.update_name.usecase.test.ts \
        tests/modules/user/usecases/user.delete_user.usecase.test.ts \
        tests/modules/user/repository/repository.user.writer.test.ts
git commit -m "feat(user): add pending_email, updatePendingEmail(), and resetPassword() to User entity"
```

---

## Task 10: User repository changes

**Files:**
- Modify: `src/modules/user/repository/repository.user.reader.ts`
- Modify: `src/modules/user/repository/repository.user.writer.ts`

- [ ] **Step 1: Update restoreHelper in repository.user.reader.ts**

Find the `restoreHelper` method and add `row.pending_email` as the last argument:

```typescript
private restoreHelper(row: any): User {
    return User.restoreUser(
        row.id,
        row.name,
        row.email,
        row.password_hashed,
        row.created_at,
        row.updated_at,
        row.is_deleted,
        row.is_verified,
        row.last_password,
        row.pending_password,
        row.pending_email,
    )
}
```

- [ ] **Step 2: Update updateUser SQL in repository.user.writer.ts**

Find the `updateUser` method and update the SQL to include `pending_email`:

```typescript
async updateUser(user: User): Promise<void> {
    try {
        await this.db.query(
            "UPDATE users SET name = $1, email = $2, password_hashed = $3, updated_at = now(), last_password = $4, pending_password = $5, pending_email = $6 WHERE id = $7",
            [user.name, user.email, user.password_hashed, user.last_password, user.pending_password, user.pending_email, user.id]
        );
    } catch (e) {
        handleDatabaseError(e, `${this.moduleName}.updateUser: ${user.id} ${user.email}`);
    }
}
```

- [ ] **Step 3: Run all repository integration tests**

```bash
npx jest tests/modules/user/repository/
```

Expected: PASS — all tests green.

- [ ] **Step 4: Commit**

```bash
git add src/modules/user/repository/repository.user.reader.ts \
        src/modules/user/repository/repository.user.writer.ts
git commit -m "feat(user): include pending_email in user repository read and write"
```

---

## Task 11: Registration use cases + tests

**Files:**
- Create: `src/modules/user/usecases/user.request_registration_verification.usecase.ts`
- Create: `src/modules/user/usecases/user.confirm_registration.usecase.ts`
- Create: `tests/modules/user/usecases/user.request_registration_verification.usecase.test.ts`
- Create: `tests/modules/user/usecases/user.confirm_registration.usecase.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/user/usecases/user.request_registration_verification.usecase.test.ts
import { UserRepoReaderInterface } from '../../../../src/modules/user/interfaces/interfaces.repository';
import { RequestRegistrationVerificationUseCase } from '../../../../src/modules/user/usecases/user.request_registration_verification.usecase';
import { CreateOtpUseCase } from '../../../../src/modules/token/usecases/token.create_otp.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('RequestRegistrationVerificationUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockCreateOtp: { execute: jest.Mock };
    let useCase: RequestRegistrationVerificationUseCase;

    const makeUser = (is_verified = false) => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), false, is_verified, 'hashed', null, null
    );

    beforeEach(() => {
        mockUserRepoReader = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        mockCreateOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new RequestRegistrationVerificationUseCase(
            mockUserRepoReader,
            mockCreateOtp as any,
        );
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);
        await expect(useCase.execute('uuid-1')).rejects.toThrow(/User not found/);
    });

    it('should throw 400 if user is already verified', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(true));
        await expect(useCase.execute('uuid-1')).rejects.toThrow(/already verified/);
    });

    it('should call CreateOtpUseCase with correct args', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(false));
        await useCase.execute('uuid-1');
        expect(mockCreateOtp.execute).toHaveBeenCalledWith('uuid-1', 'john@example.com', TokenPurpose.REGISTRATION);
    });
});
```

```typescript
// tests/modules/user/usecases/user.confirm_registration.usecase.test.ts
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interfaces.repository';
import { ConfirmRegistrationUseCase } from '../../../../src/modules/user/usecases/user.confirm_registration.usecase';
import { VerifyOtpUseCase } from '../../../../src/modules/token/usecases/token.verify_otp.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';

describe('ConfirmRegistrationUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockVerifyOtp: { execute: jest.Mock };
    let useCase: ConfirmRegistrationUseCase;

    const makeUser = (is_verified = false) => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), false, is_verified, 'hashed', null, null
    );

    beforeEach(() => {
        mockUserRepoReader = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        mockUserRepoWriter = {
            createUser: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            markUserAsVerified: jest.fn().mockResolvedValue(undefined),
        };
        mockVerifyOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new ConfirmRegistrationUseCase(
            mockUserRepoReader,
            mockUserRepoWriter,
            mockVerifyOtp as any,
        );
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/User not found/);
    });

    it('should throw 400 if user is already verified', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(true));
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/already verified/);
    });

    it('should call VerifyOtpUseCase then markUserAsVerified', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(false));
        await useCase.execute('uuid-1', '123456');
        expect(mockVerifyOtp.execute).toHaveBeenCalledWith('uuid-1', TokenPurpose.REGISTRATION, '123456');
        expect(mockUserRepoWriter.markUserAsVerified).toHaveBeenCalledWith('uuid-1');
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/modules/user/usecases/user.request_registration_verification.usecase.test.ts tests/modules/user/usecases/user.confirm_registration.usecase.test.ts
```

Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implement RequestRegistrationVerificationUseCase**

```typescript
// src/modules/user/usecases/user.request_registration_verification.usecase.ts
import { UserRepoReaderInterface } from '../interfaces/interfaces.repository';
import { throwAppError } from '../../errors/errors.global';
import { CreateOtpUseCase } from '../../token/usecases/token.create_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class RequestRegistrationVerificationUseCase {
    private moduleName = 'RequestRegistrationVerificationUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly createOtpUseCase: CreateOtpUseCase,
    ) {}

    static create(userRepoReader: UserRepoReaderInterface, createOtpUseCase: CreateOtpUseCase): RequestRegistrationVerificationUseCase {
        return new RequestRegistrationVerificationUseCase(userRepoReader, createOtpUseCase);
    }

    async execute(userId: string): Promise<void> {
        const user = await this.userRepoReader.getUserById(userId);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }
        if (user.is_verified) {
            throwAppError('User is already verified.', 400, `${this.moduleName}.execute()`);
        }
        await this.createOtpUseCase.execute(userId, user.email, TokenPurpose.REGISTRATION);
    }
}
```

- [ ] **Step 4: Implement ConfirmRegistrationUseCase**

```typescript
// src/modules/user/usecases/user.confirm_registration.usecase.ts
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interfaces.repository';
import { throwAppError } from '../../errors/errors.global';
import { VerifyOtpUseCase } from '../../token/usecases/token.verify_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class ConfirmRegistrationUseCase {
    private moduleName = 'ConfirmRegistrationUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly verifyOtpUseCase: VerifyOtpUseCase,
    ) {}

    static create(userRepoReader: UserRepoReaderInterface, userRepoWriter: UserRepoWriterInterface, verifyOtpUseCase: VerifyOtpUseCase): ConfirmRegistrationUseCase {
        return new ConfirmRegistrationUseCase(userRepoReader, userRepoWriter, verifyOtpUseCase);
    }

    async execute(userId: string, otp: string): Promise<void> {
        const user = await this.userRepoReader.getUserById(userId);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }
        if (user.is_verified) {
            throwAppError('User is already verified.', 400, `${this.moduleName}.execute()`);
        }
        await this.verifyOtpUseCase.execute(userId, TokenPurpose.REGISTRATION, otp);
        await this.userRepoWriter.markUserAsVerified(userId);
    }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx jest tests/modules/user/usecases/user.request_registration_verification.usecase.test.ts tests/modules/user/usecases/user.confirm_registration.usecase.test.ts
```

Expected: PASS — all 6 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/modules/user/usecases/user.request_registration_verification.usecase.ts \
        src/modules/user/usecases/user.confirm_registration.usecase.ts \
        tests/modules/user/usecases/user.request_registration_verification.usecase.test.ts \
        tests/modules/user/usecases/user.confirm_registration.usecase.test.ts
git commit -m "feat(user): add registration OTP verification use cases"
```

---

## Task 12: Password reset use cases + tests

**Files:**
- Create: `src/modules/user/usecases/user.request_password_reset.usecase.ts`
- Create: `src/modules/user/usecases/user.confirm_password_reset.usecase.ts`
- Create: `tests/modules/user/usecases/user.request_password_reset.usecase.test.ts`
- Create: `tests/modules/user/usecases/user.confirm_password_reset.usecase.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/user/usecases/user.request_password_reset.usecase.test.ts
import { UserRepoReaderInterface } from '../../../../src/modules/user/interfaces/interfaces.repository';
import { RequestPasswordResetUseCase } from '../../../../src/modules/user/usecases/user.request_password_reset.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';

describe('RequestPasswordResetUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockCreateOtp: { execute: jest.Mock };
    let useCase: RequestPasswordResetUseCase;

    const makeUser = () => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), false, false, 'hashed', null, null
    );

    beforeEach(() => {
        mockUserRepoReader = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        mockCreateOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new RequestPasswordResetUseCase(mockUserRepoReader, mockCreateOtp as any);
    });

    it('should throw AppError for invalid email format', async () => {
        await expect(useCase.execute('not-an-email')).rejects.toThrow(/valid email/);
    });

    it('should throw 404 if no user found for the email', async () => {
        mockUserRepoReader.getUserByEmail.mockResolvedValue(null);
        await expect(useCase.execute('john@example.com')).rejects.toThrow(/User not found/);
    });

    it('should call CreateOtpUseCase with correct args', async () => {
        mockUserRepoReader.getUserByEmail.mockResolvedValue(makeUser());
        await useCase.execute('john@example.com');
        expect(mockCreateOtp.execute).toHaveBeenCalledWith('uuid-1', 'john@example.com', TokenPurpose.RESET_PASSWORD);
    });
});
```

```typescript
// tests/modules/user/usecases/user.confirm_password_reset.usecase.test.ts
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interfaces.repository';
import { ConfirmPasswordResetUseCase } from '../../../../src/modules/user/usecases/user.confirm_password_reset.usecase';
import { InfraPasswordHasherInterface } from '../../../../src/modules/infra/password/infra.password_hasher.interfaces';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';

describe('ConfirmPasswordResetUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockPasswordHasher: jest.Mocked<InfraPasswordHasherInterface>;
    let mockVerifyOtp: { execute: jest.Mock };
    let useCase: ConfirmPasswordResetUseCase;

    const makeUser = () => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'old_hashed',
        new Date(), new Date(), false, false, 'old_hashed', null, null
    );

    beforeEach(() => {
        mockUserRepoReader = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        mockUserRepoWriter = {
            createUser: jest.fn(),
            updateUser: jest.fn().mockResolvedValue(undefined),
            deleteUser: jest.fn(),
            markUserAsVerified: jest.fn(),
        };
        mockPasswordHasher = { hash: jest.fn(), compare: jest.fn() };
        mockVerifyOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new ConfirmPasswordResetUseCase(
            mockUserRepoReader,
            mockUserRepoWriter,
            mockPasswordHasher,
            mockVerifyOtp as any,
        );
    });

    it('should throw for invalid email', async () => {
        await expect(useCase.execute('bad', '123456', 'NewPassword123!')).rejects.toThrow(/valid email/);
    });

    it('should throw for invalid password format', async () => {
        await expect(useCase.execute('john@example.com', '123456', 'weak')).rejects.toThrow(/Password must/);
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserByEmail.mockResolvedValue(null);
        await expect(useCase.execute('john@example.com', '123456', 'NewPassword123!')).rejects.toThrow(/User not found/);
    });

    it('should call verifyOtp, hash new password, resetPassword, and updateUser', async () => {
        const user = makeUser();
        mockUserRepoReader.getUserByEmail.mockResolvedValue(user);
        mockPasswordHasher.hash.mockResolvedValue('new_hashed');

        await useCase.execute('john@example.com', '123456', 'NewPassword123!');

        expect(mockVerifyOtp.execute).toHaveBeenCalledWith('uuid-1', TokenPurpose.RESET_PASSWORD, '123456');
        expect(mockPasswordHasher.hash).toHaveBeenCalledWith('NewPassword123!');
        expect(user.password_hashed).toBe('new_hashed');
        expect(user.last_password).toBe('new_hashed');
        expect(mockUserRepoWriter.updateUser).toHaveBeenCalledWith(user);
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/modules/user/usecases/user.request_password_reset.usecase.test.ts tests/modules/user/usecases/user.confirm_password_reset.usecase.test.ts
```

Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implement RequestPasswordResetUseCase**

```typescript
// src/modules/user/usecases/user.request_password_reset.usecase.ts
import { UserRepoReaderInterface } from '../interfaces/interfaces.repository';
import { UserValidator } from '../entity/user.validator';
import { throwAppError } from '../../errors/errors.global';
import { CreateOtpUseCase } from '../../token/usecases/token.create_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class RequestPasswordResetUseCase {
    private moduleName = 'RequestPasswordResetUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly createOtpUseCase: CreateOtpUseCase,
    ) {}

    static create(userRepoReader: UserRepoReaderInterface, createOtpUseCase: CreateOtpUseCase): RequestPasswordResetUseCase {
        return new RequestPasswordResetUseCase(userRepoReader, createOtpUseCase);
    }

    async execute(email: string): Promise<void> {
        UserValidator.validateEmail(email);

        const user = await this.userRepoReader.getUserByEmail(email);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }

        await this.createOtpUseCase.execute(user.id, email, TokenPurpose.RESET_PASSWORD);
    }
}
```

- [ ] **Step 4: Implement ConfirmPasswordResetUseCase**

```typescript
// src/modules/user/usecases/user.confirm_password_reset.usecase.ts
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interfaces.repository';
import { UserValidator } from '../entity/user.validator';
import { throwAppError } from '../../errors/errors.global';
import { InfraPasswordHasherInterface } from '../../infra/password/infra.password_hasher.interfaces';
import { VerifyOtpUseCase } from '../../token/usecases/token.verify_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class ConfirmPasswordResetUseCase {
    private moduleName = 'ConfirmPasswordResetUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly passwordHasher: InfraPasswordHasherInterface,
        private readonly verifyOtpUseCase: VerifyOtpUseCase,
    ) {}

    static create(
        userRepoReader: UserRepoReaderInterface,
        userRepoWriter: UserRepoWriterInterface,
        passwordHasher: InfraPasswordHasherInterface,
        verifyOtpUseCase: VerifyOtpUseCase,
    ): ConfirmPasswordResetUseCase {
        return new ConfirmPasswordResetUseCase(userRepoReader, userRepoWriter, passwordHasher, verifyOtpUseCase);
    }

    async execute(email: string, otp: string, newPassword: string): Promise<void> {
        UserValidator.validateEmail(email);
        UserValidator.validatePassword(newPassword);

        const user = await this.userRepoReader.getUserByEmail(email);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }

        await this.verifyOtpUseCase.execute(user.id, TokenPurpose.RESET_PASSWORD, otp);

        const newPasswordHashed = await this.passwordHasher.hash(newPassword);
        user.resetPassword(newPasswordHashed);

        await this.userRepoWriter.updateUser(user);
    }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx jest tests/modules/user/usecases/user.request_password_reset.usecase.test.ts tests/modules/user/usecases/user.confirm_password_reset.usecase.test.ts
```

Expected: PASS — all 7 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/modules/user/usecases/user.request_password_reset.usecase.ts \
        src/modules/user/usecases/user.confirm_password_reset.usecase.ts \
        tests/modules/user/usecases/user.request_password_reset.usecase.test.ts \
        tests/modules/user/usecases/user.confirm_password_reset.usecase.test.ts
git commit -m "feat(user): add password reset OTP use cases"
```

---

## Task 13: Email change use cases + tests

**Files:**
- Create: `src/modules/user/usecases/user.request_email_change.usecase.ts`
- Create: `src/modules/user/usecases/user.confirm_email_change.usecase.ts`
- Create: `tests/modules/user/usecases/user.request_email_change.usecase.test.ts`
- Create: `tests/modules/user/usecases/user.confirm_email_change.usecase.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/modules/user/usecases/user.request_email_change.usecase.test.ts
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interfaces.repository';
import { RequestEmailChangeUseCase } from '../../../../src/modules/user/usecases/user.request_email_change.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';

describe('RequestEmailChangeUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockCreateOtp: { execute: jest.Mock };
    let useCase: RequestEmailChangeUseCase;

    const makeUser = () => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), false, true, 'hashed', null, null
    );

    beforeEach(() => {
        mockUserRepoReader = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        mockUserRepoWriter = {
            createUser: jest.fn(),
            updateUser: jest.fn().mockResolvedValue(undefined),
            deleteUser: jest.fn(),
            markUserAsVerified: jest.fn(),
        };
        mockCreateOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new RequestEmailChangeUseCase(mockUserRepoReader, mockUserRepoWriter, mockCreateOtp as any);
    });

    it('should throw for invalid new email format', async () => {
        await expect(useCase.execute('uuid-1', 'not-an-email')).rejects.toThrow(/valid email/);
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);
        await expect(useCase.execute('uuid-1', 'new@example.com')).rejects.toThrow(/User not found/);
    });

    it('should set pending_email, call updateUser, then call CreateOtp with new email', async () => {
        const user = makeUser();
        mockUserRepoReader.getUserById.mockResolvedValue(user);

        await useCase.execute('uuid-1', 'new@example.com');

        expect(user.pending_email).toBe('new@example.com');
        expect(mockUserRepoWriter.updateUser).toHaveBeenCalledWith(user);
        expect(mockCreateOtp.execute).toHaveBeenCalledWith('uuid-1', 'new@example.com', TokenPurpose.CHANGE_EMAIL);
    });

    it('should throw if user is not verified (via entity guard)', async () => {
        const user = User.restoreUser(
            'uuid-1', 'John Doe', 'john@example.com', 'hashed',
            new Date(), new Date(), false, false, 'hashed', null, null
        );
        mockUserRepoReader.getUserById.mockResolvedValue(user);
        await expect(useCase.execute('uuid-1', 'new@example.com')).rejects.toThrow(/not verified/);
    });
});
```

```typescript
// tests/modules/user/usecases/user.confirm_email_change.usecase.test.ts
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interfaces.repository';
import { ConfirmEmailChangeUseCase } from '../../../../src/modules/user/usecases/user.confirm_email_change.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';

describe('ConfirmEmailChangeUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockVerifyOtp: { execute: jest.Mock };
    let useCase: ConfirmEmailChangeUseCase;

    const makeUser = (pending_email: string | null = 'new@example.com') => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), false, true, 'hashed', null, pending_email
    );

    beforeEach(() => {
        mockUserRepoReader = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        mockUserRepoWriter = {
            createUser: jest.fn(),
            updateUser: jest.fn().mockResolvedValue(undefined),
            deleteUser: jest.fn(),
            markUserAsVerified: jest.fn(),
        };
        mockVerifyOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new ConfirmEmailChangeUseCase(mockUserRepoReader, mockUserRepoWriter, mockVerifyOtp as any);
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/User not found/);
    });

    it('should throw 400 if no pending email change', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(null));
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/No pending email change/);
    });

    it('should verify OTP, apply pending_email, clear it, and persist', async () => {
        const user = makeUser('new@example.com');
        mockUserRepoReader.getUserById.mockResolvedValue(user);

        await useCase.execute('uuid-1', '123456');

        expect(mockVerifyOtp.execute).toHaveBeenCalledWith('uuid-1', TokenPurpose.CHANGE_EMAIL, '123456');
        expect(user.email).toBe('new@example.com');
        expect(user.pending_email).toBeNull();
        expect(mockUserRepoWriter.updateUser).toHaveBeenCalledWith(user);
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/modules/user/usecases/user.request_email_change.usecase.test.ts tests/modules/user/usecases/user.confirm_email_change.usecase.test.ts
```

Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implement RequestEmailChangeUseCase**

```typescript
// src/modules/user/usecases/user.request_email_change.usecase.ts
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interfaces.repository';
import { UserValidator } from '../entity/user.validator';
import { throwAppError } from '../../errors/errors.global';
import { CreateOtpUseCase } from '../../token/usecases/token.create_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class RequestEmailChangeUseCase {
    private moduleName = 'RequestEmailChangeUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly createOtpUseCase: CreateOtpUseCase,
    ) {}

    static create(
        userRepoReader: UserRepoReaderInterface,
        userRepoWriter: UserRepoWriterInterface,
        createOtpUseCase: CreateOtpUseCase,
    ): RequestEmailChangeUseCase {
        return new RequestEmailChangeUseCase(userRepoReader, userRepoWriter, createOtpUseCase);
    }

    async execute(userId: string, newEmail: string): Promise<void> {
        UserValidator.validateEmail(newEmail);

        const user = await this.userRepoReader.getUserById(userId);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }

        user.updatePendingEmail(newEmail);
        await this.userRepoWriter.updateUser(user);
        await this.createOtpUseCase.execute(userId, newEmail, TokenPurpose.CHANGE_EMAIL);
    }
}
```

- [ ] **Step 4: Implement ConfirmEmailChangeUseCase**

```typescript
// src/modules/user/usecases/user.confirm_email_change.usecase.ts
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interfaces.repository';
import { throwAppError } from '../../errors/errors.global';
import { VerifyOtpUseCase } from '../../token/usecases/token.verify_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class ConfirmEmailChangeUseCase {
    private moduleName = 'ConfirmEmailChangeUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly verifyOtpUseCase: VerifyOtpUseCase,
    ) {}

    static create(
        userRepoReader: UserRepoReaderInterface,
        userRepoWriter: UserRepoWriterInterface,
        verifyOtpUseCase: VerifyOtpUseCase,
    ): ConfirmEmailChangeUseCase {
        return new ConfirmEmailChangeUseCase(userRepoReader, userRepoWriter, verifyOtpUseCase);
    }

    async execute(userId: string, otp: string): Promise<void> {
        const user = await this.userRepoReader.getUserById(userId);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }
        if (user.pending_email === null) {
            throwAppError('No pending email change.', 400, `${this.moduleName}.execute()`);
        }

        await this.verifyOtpUseCase.execute(userId, TokenPurpose.CHANGE_EMAIL, otp);

        user.updateEmail(user.pending_email);
        user.updatePendingEmail(null);
        await this.userRepoWriter.updateUser(user);
    }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx jest tests/modules/user/usecases/user.request_email_change.usecase.test.ts tests/modules/user/usecases/user.confirm_email_change.usecase.test.ts
```

Expected: PASS — all 7 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/modules/user/usecases/user.request_email_change.usecase.ts \
        src/modules/user/usecases/user.confirm_email_change.usecase.ts \
        tests/modules/user/usecases/user.request_email_change.usecase.test.ts \
        tests/modules/user/usecases/user.confirm_email_change.usecase.test.ts
git commit -m "feat(user): add email change OTP use cases"
```

---

## Task 14: Account deletion use cases + tests

**Files:**
- Rename + refactor: `src/modules/user/usecases/user.delete_user.usecase.ts` → `src/modules/user/usecases/user.request_account_deletion.usecase.ts`
- Create: `src/modules/user/usecases/user.confirm_account_deletion.usecase.ts`
- Create: `tests/modules/user/usecases/user.request_account_deletion.usecase.test.ts`
- Create: `tests/modules/user/usecases/user.confirm_account_deletion.usecase.test.ts`
- Delete: `tests/modules/user/usecases/user.delete_user.usecase.test.ts`

- [ ] **Step 1: Delete old test file**

```bash
rm tests/modules/user/usecases/user.delete_user.usecase.test.ts
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/modules/user/usecases/user.request_account_deletion.usecase.test.ts
import { UserRepoReaderInterface } from '../../../../src/modules/user/interfaces/interfaces.repository';
import { RequestAccountDeletionUseCase } from '../../../../src/modules/user/usecases/user.request_account_deletion.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('RequestAccountDeletionUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockCreateOtp: { execute: jest.Mock };
    let useCase: RequestAccountDeletionUseCase;

    const makeUser = (is_deleted = false) => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), is_deleted, true, 'hashed', null, null
    );

    beforeEach(() => {
        mockUserRepoReader = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        mockCreateOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new RequestAccountDeletionUseCase(mockUserRepoReader, mockCreateOtp as any);
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);
        await expect(useCase.execute('uuid-1')).rejects.toThrow(/User not found/);
    });

    it('should throw 400 if user is already deleted', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(true));
        await expect(useCase.execute('uuid-1')).rejects.toThrow(AppError);
        await expect(useCase.execute('uuid-1')).rejects.toThrow(/already deleted/);
    });

    it('should call CreateOtpUseCase with correct args', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(false));
        await useCase.execute('uuid-1');
        expect(mockCreateOtp.execute).toHaveBeenCalledWith('uuid-1', 'john@example.com', TokenPurpose.DELETE_ACCOUNT);
    });
});
```

```typescript
// tests/modules/user/usecases/user.confirm_account_deletion.usecase.test.ts
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interfaces.repository';
import { ConfirmAccountDeletionUseCase } from '../../../../src/modules/user/usecases/user.confirm_account_deletion.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('ConfirmAccountDeletionUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockVerifyOtp: { execute: jest.Mock };
    let useCase: ConfirmAccountDeletionUseCase;

    const makeUser = (is_deleted = false) => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), is_deleted, true, 'hashed', null, null
    );

    beforeEach(() => {
        mockUserRepoReader = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        mockUserRepoWriter = {
            createUser: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn().mockResolvedValue(undefined),
            markUserAsVerified: jest.fn(),
        };
        mockVerifyOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new ConfirmAccountDeletionUseCase(mockUserRepoReader, mockUserRepoWriter, mockVerifyOtp as any);
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/User not found/);
    });

    it('should throw 400 if user is already deleted', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(true));
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(AppError);
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/already deleted/);
    });

    it('should call VerifyOtp then deleteUser', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(false));
        await useCase.execute('uuid-1', '123456');
        expect(mockVerifyOtp.execute).toHaveBeenCalledWith('uuid-1', TokenPurpose.DELETE_ACCOUNT, '123456');
        expect(mockUserRepoWriter.deleteUser).toHaveBeenCalledWith('uuid-1');
    });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx jest tests/modules/user/usecases/user.request_account_deletion.usecase.test.ts tests/modules/user/usecases/user.confirm_account_deletion.usecase.test.ts
```

Expected: FAIL — `Cannot find module`.

- [ ] **Step 4: Create user.request_account_deletion.usecase.ts (replaces delete_user)**

```typescript
// src/modules/user/usecases/user.request_account_deletion.usecase.ts
import { UserRepoReaderInterface } from '../interfaces/interfaces.repository';
import { throwAppError } from '../../errors/errors.global';
import { CreateOtpUseCase } from '../../token/usecases/token.create_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class RequestAccountDeletionUseCase {
    private moduleName = 'RequestAccountDeletionUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly createOtpUseCase: CreateOtpUseCase,
    ) {}

    static create(userRepoReader: UserRepoReaderInterface, createOtpUseCase: CreateOtpUseCase): RequestAccountDeletionUseCase {
        return new RequestAccountDeletionUseCase(userRepoReader, createOtpUseCase);
    }

    async execute(userId: string): Promise<void> {
        const user = await this.userRepoReader.getUserById(userId);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }
        user.assertDelete();
        await this.createOtpUseCase.execute(userId, user.email, TokenPurpose.DELETE_ACCOUNT);
    }
}
```

- [ ] **Step 5: Create user.confirm_account_deletion.usecase.ts**

```typescript
// src/modules/user/usecases/user.confirm_account_deletion.usecase.ts
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interfaces.repository';
import { throwAppError } from '../../errors/errors.global';
import { VerifyOtpUseCase } from '../../token/usecases/token.verify_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class ConfirmAccountDeletionUseCase {
    private moduleName = 'ConfirmAccountDeletionUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly verifyOtpUseCase: VerifyOtpUseCase,
    ) {}

    static create(
        userRepoReader: UserRepoReaderInterface,
        userRepoWriter: UserRepoWriterInterface,
        verifyOtpUseCase: VerifyOtpUseCase,
    ): ConfirmAccountDeletionUseCase {
        return new ConfirmAccountDeletionUseCase(userRepoReader, userRepoWriter, verifyOtpUseCase);
    }

    async execute(userId: string, otp: string): Promise<void> {
        const user = await this.userRepoReader.getUserById(userId);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }
        user.assertDelete();
        await this.verifyOtpUseCase.execute(userId, TokenPurpose.DELETE_ACCOUNT, otp);
        await this.userRepoWriter.deleteUser(userId);
    }
}
```

- [ ] **Step 6: Delete old source file**

```bash
rm src/modules/user/usecases/user.delete_user.usecase.ts
```

- [ ] **Step 7: Run tests to confirm they pass**

```bash
npx jest tests/modules/user/usecases/user.request_account_deletion.usecase.test.ts tests/modules/user/usecases/user.confirm_account_deletion.usecase.test.ts
```

Expected: PASS — all 6 tests green.

- [ ] **Step 8: Commit**

```bash
git add src/modules/user/usecases/user.request_account_deletion.usecase.ts \
        src/modules/user/usecases/user.confirm_account_deletion.usecase.ts \
        tests/modules/user/usecases/user.request_account_deletion.usecase.test.ts \
        tests/modules/user/usecases/user.confirm_account_deletion.usecase.test.ts
git rm src/modules/user/usecases/user.delete_user.usecase.ts \
       tests/modules/user/usecases/user.delete_user.usecase.test.ts
git commit -m "feat(user): refactor account deletion into request/confirm OTP use cases"
```

---

## Task 15: Container wiring

**Files:**
- Modify: `src/container.ts`

- [ ] **Step 1: Update container.ts**

Replace the full content of `src/container.ts`:

```typescript
import { pool } from "./database";
import { RepositoryUserReader } from "./modules/user/repository/repository.user.reader";
import { RepositoryUserWriter } from "./modules/user/repository/repository.user.writer";
import { RepositoryTokenReader } from "./modules/token/repository/repository.token.reader";
import { RepositoryTokenWriter } from "./modules/token/repository/repository.token.writer";
import { InfraPasswordBcryptImplementation } from "./modules/infra/password/infra.pasword_bcrypt.implementation";
import { InfraEmailNodemailerImplementation } from "./modules/infra/email/infra.email_nodemailer.implementation";
import { CreateOtpUseCase } from "./modules/token/usecases/token.create_otp.usecase";
import { VerifyOtpUseCase } from "./modules/token/usecases/token.verify_otp.usecase";
import { UserChangePasswordUseCase } from "./modules/user/usecases/user.change_password.usecase";
import { UserUpdateNameUseCase } from "./modules/user/usecases/user.update_name.usecase";
import { RequestRegistrationVerificationUseCase } from "./modules/user/usecases/user.request_registration_verification.usecase";
import { ConfirmRegistrationUseCase } from "./modules/user/usecases/user.confirm_registration.usecase";
import { RequestPasswordResetUseCase } from "./modules/user/usecases/user.request_password_reset.usecase";
import { ConfirmPasswordResetUseCase } from "./modules/user/usecases/user.confirm_password_reset.usecase";
import { RequestEmailChangeUseCase } from "./modules/user/usecases/user.request_email_change.usecase";
import { ConfirmEmailChangeUseCase } from "./modules/user/usecases/user.confirm_email_change.usecase";
import { RequestAccountDeletionUseCase } from "./modules/user/usecases/user.request_account_deletion.usecase";
import { ConfirmAccountDeletionUseCase } from "./modules/user/usecases/user.confirm_account_deletion.usecase";

export function createDepsContainer() {
    const userRepoReader = RepositoryUserReader.create(pool);
    const userRepoWriter = RepositoryUserWriter.create(pool);
    const tokenRepoReader = RepositoryTokenReader.create(pool);
    const tokenRepoWriter = RepositoryTokenWriter.create(pool);

    const bcryptHasher = InfraPasswordBcryptImplementation.create(12);

    const emailSender = InfraEmailNodemailerImplementation.create(
        process.env.SMTP_HOST!,
        Number(process.env.SMTP_PORT!),
        process.env.SMTP_USER!,
        process.env.SMTP_PASS!,
    );

    const createOtpUseCase = CreateOtpUseCase.create(tokenRepoWriter, emailSender);
    const verifyOtpUseCase = VerifyOtpUseCase.create(tokenRepoReader, tokenRepoWriter);

    const userChangePasswordUseCase = UserChangePasswordUseCase.create(userRepoReader, userRepoWriter, bcryptHasher);
    const userUpdateNameUseCase = UserUpdateNameUseCase.create(userRepoReader, userRepoWriter);

    const requestRegistrationVerificationUseCase = RequestRegistrationVerificationUseCase.create(userRepoReader, createOtpUseCase);
    const confirmRegistrationUseCase = ConfirmRegistrationUseCase.create(userRepoReader, userRepoWriter, verifyOtpUseCase);

    const requestPasswordResetUseCase = RequestPasswordResetUseCase.create(userRepoReader, createOtpUseCase);
    const confirmPasswordResetUseCase = ConfirmPasswordResetUseCase.create(userRepoReader, userRepoWriter, bcryptHasher, verifyOtpUseCase);

    const requestEmailChangeUseCase = RequestEmailChangeUseCase.create(userRepoReader, userRepoWriter, createOtpUseCase);
    const confirmEmailChangeUseCase = ConfirmEmailChangeUseCase.create(userRepoReader, userRepoWriter, verifyOtpUseCase);

    const requestAccountDeletionUseCase = RequestAccountDeletionUseCase.create(userRepoReader, createOtpUseCase);
    const confirmAccountDeletionUseCase = ConfirmAccountDeletionUseCase.create(userRepoReader, userRepoWriter, verifyOtpUseCase);

    return {
        userChangePasswordUseCase,
        userUpdateNameUseCase,
        requestRegistrationVerificationUseCase,
        confirmRegistrationUseCase,
        requestPasswordResetUseCase,
        confirmPasswordResetUseCase,
        requestEmailChangeUseCase,
        confirmEmailChangeUseCase,
        requestAccountDeletionUseCase,
        confirmAccountDeletionUseCase,
    };
}

export type DepsContainer = ReturnType<typeof createDepsContainer>;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No TypeScript errors. Output files appear in `dist/`.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: All tests pass, no failures.

- [ ] **Step 4: Commit**

```bash
git add src/container.ts
git commit -m "feat: wire OTP email verification into dependency container"
```
