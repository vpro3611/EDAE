# EDAE — Technical Reference

This document is aimed at developers working on or integrating with the EDAE codebase. It covers architecture, module layout, data flow, testing conventions, and extension points.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Directory Layout](#2-directory-layout)
3. [Module Anatomy](#3-module-anatomy)
4. [Domain Modules](#4-domain-modules)
5. [Infrastructure Layer](#5-infrastructure-layer)
6. [Authentication & Security](#6-authentication--security)
7. [Background Workers](#7-background-workers)
8. [Database](#8-database)
9. [Rate Limiting](#9-rate-limiting)
10. [Error Handling](#10-error-handling)
11. [Dependency Injection](#11-dependency-injection)
12. [Testing Strategy](#12-testing-strategy)
13. [Adding a New Module](#13-adding-a-new-module)

---

## 1. Architecture Overview

EDAE follows **Clean Architecture** with a strict dependency rule: outer layers depend on inner ones, never the reverse.

```
┌──────────────────────────────────────────────┐
│  HTTP Controllers  (interface adapters)       │
│  Transactional Services  (orchestration)      │
├──────────────────────────────────────────────┤
│  Use Cases  (application business rules)      │
├──────────────────────────────────────────────┤
│  Entities + Validators  (domain rules)        │
│  Repository Interfaces  (contracts)           │
├──────────────────────────────────────────────┤
│  Repository Implementations  (PostgreSQL)     │
│  Infrastructure Adapters  (bcrypt, email …)   │
└──────────────────────────────────────────────┘
```

Key design decisions:

- **Repositories are split** into a reader (`*RepoReaderInterface`) and a writer (`*RepoWriterInterface`). This keeps queries separate from mutations and makes use cases easier to mock.
- **Use cases never touch the database directly.** All I/O goes through injected repository or infrastructure interfaces.
- **Transactional services** wrap one or more use cases inside a single `pg` transaction via `TransactionManagerInterface`. Repositories and use cases inside a transaction are always instantiated with the transactional `client` via their static `create(client)` factory.
- **Controllers are thin.** They validate the HTTP body with Zod, extract the actor ID from the JWT, delegate to a transactional service, and return a typed response. No domain logic lives here.

---

## 2. Directory Layout

```
src/
├── index.ts                    ← process entry point (starts HTTP + workers)
├── server.ts                   ← creates HTTP server from Express app
├── app.ts                      ← mounts /pub and /protected routers, applies middlewares
├── container.ts                ← wires all dependencies (composition root)
├── database.ts                 ← exports shared pg.Pool
├── redis.ts                    ← exports shared ioredis client
├── api_limiter.ts              ← token-bucket factories for public endpoints
├── express.declare_global.ts   ← augments Express Request type (req.user)
│
├── modules/
│   ├── user/                   ← user domain
│   ├── token/                  ← OTP token domain
│   ├── authentification/       ← auth service, JWT, controllers
│   ├── connection/             ← notification channel domain
│   ├── github_source/          ← watched repository domain
│   ├── subscription/           ← GitHub event subscription domain
│   ├── report/                 ← PDF report generation and scheduling
│   ├── notification/           ← cross-domain notification dispatcher
│   ├── infra/                  ← cross-cutting infrastructure adapters
│   ├── middlewares/            ← Express middlewares (auth, errors, Zod)
│   └── errors/                 ← AppError, DatabaseError, pg error mapper
│
└── workers/
    ├── worker.bootstrap.ts     ← BullMQ queue + worker initialisation
    ├── github.poller.ts        ← per-event-type GitHub polling logic
    ├── github.poll.worker.ts   ← processes a single subscription
    └── report.worker.ts        ← scheduled PDF report delivery
```

---

## 3. Module Anatomy

Every domain module follows the same internal structure:

```
src/modules/<domain>/
├── interfaces/
│   └── interface.repository.ts          ← reader + writer interfaces (contracts)
├── repository/
│   ├── repository.<domain>.reader.ts    ← PostgreSQL read implementation
│   └── repository.<domain>.writer.ts   ← PostgreSQL write implementation
├── usecases/
│   └── <domain>.<action>.usecase.ts    ← application logic, no direct DB access
├── entity/
│   ├── <domain>.ts                     ← domain object with guard/mutation methods
│   └── <domain>.validator.ts           ← field-level validation helpers
├── dto/
│   ├── <domain>.dto.ts                 ← output shape (what callers receive)
│   └── <domain>.dto.mapper.ts          ← entity → DTO conversion
├── transactional_services/
│   └── tx_service.<action>.ts          ← run use cases inside a transaction
└── controllers/
    └── controller.<action>.ts          ← HTTP handler + Zod schema
```

---

## 4. Domain Modules

### 4.1 `user`

Core user management. Handles the full lifecycle of a user account.

**Entity guards:** `ensureActiveAndVerified()`, `canLogin()`, `canChangePwd()`, `canDelete()` — all throw `AppError` before any mutation is allowed on an inactive or unverified user.

**Use cases:**

| Use Case | Description |
|----------|-------------|
| `RequestRegistrationVerificationUseCase` | Creates user, hashes password, sends OTP |
| `ConfirmRegistrationUseCase` | Verifies OTP, marks user as verified |
| `UserLoginEmailUseCase` | Validates credentials, returns user for JWT issuance |
| `UserChangePasswordUseCase` | Verifies old password, hashes and persists new one |
| `UserUpdateNameUseCase` | Updates display name |
| `RequestPasswordResetUseCase` | Sends OTP email for unauthenticated reset |
| `ConfirmPasswordResetUseCase` | Verifies OTP, applies new password hash |
| `RequestEmailChangeUseCase` | Stores pending email, sends OTP |
| `ConfirmEmailChangeUseCase` | Verifies OTP, swaps email |
| `RequestAccountDeletionUseCase` | Sends deletion confirmation OTP |
| `ConfirmAccountDeletionUseCase` | Verifies OTP, soft-deletes user |
| `UserGetSelfProfileUseCase` | Returns `UserDtoForSelf` |
| `UserGetOtherProfileUseCase` | Returns `UserDtoForOther` (no sensitive fields) |

**DTO types:**

- `UserDtoForSelf` — full profile (id, name, email, isVerified, createdAt)
- `UserDtoForOther` — public profile (id, name, createdAt)

### 4.2 `token`

OTP (one-time-password) lifecycle. Used by every action that requires email confirmation.

- `CreateOtpUseCase` — generates a 6-digit code, persists a hashed version with TTL, sends the code via email.
- `VerifyOtpUseCase` — looks up the stored hash, validates the candidate, marks the token as used.

Tokens expire and are single-use. Attempting to verify an expired or already-used token returns a 400.

### 4.3 `authentification`

`AuthentificationService` orchestrates the four auth flows:

| Method | Flow |
|--------|------|
| `registerRequest` | Creates user + sends OTP |
| `registerConfirm` | Verifies OTP → issues access + refresh tokens |
| `loginEmail` | Validates credentials → issues access + refresh tokens |
| `refresh` | Validates refresh token hash → rotates tokens |
| `logout` | Revokes refresh token by hash |

**JWT sub-system** (`src/modules/authentification/jwt/`):

- `JwtTokenService` — signs/verifies access tokens (short-lived) and refresh tokens (long-lived).
- Refresh token hashes (SHA-256) are stored in the `refresh_tokens` table. The raw token is never persisted.
- Access token payload: `{ sub: userId, iat, exp }`.

### 4.4 `connection`

A connection is a named notification channel belonging to a user. Supported providers: `telegram`, `slack`, `email`.

Credentials are validated by `ConnectionCredentialsSchema` (Zod union) on write, then **encrypted with AES-256-GCM** before being stored. The encryption key is set via `ENCRYPTION_KEY` in the environment.

Connections support **soft delete / restore** — deleted connections retain their row so that subscriptions referencing them can still be inspected.

### 4.5 `github_source`

A GitHub source maps to a single repository (`owner/repo`). An optional `access_token` (encrypted at rest) allows watching private repos. The access token is decrypted in-memory only when making GitHub API requests.

### 4.6 `subscription`

A subscription joins a `GithubSource`, an event type, and a `Connection`. It stores:

- `event_type` — one of 11 event types (see README).
- `message_template` — a `{{ variable }}` string rendered at dispatch time.
- `config` — event-specific options (e.g. `{ milestone: 500 }` for `star_milestone`).
- `last_seen` — opaque JSON checkpoint used by the poller to detect new events without re-processing old ones.

### 4.7 `report`

A `ReportConfig` ties a `Connection` to a delivery frequency (`daily` | `weekly` | `monthly`) and an optional `schedule_day`.

`GenerateReportService.generateForConfig()` is the main entry point:

1. Loads the config and connection.
2. Determines the `since` date from the frequency.
3. Calls `FetchGithubActivityUseCase` to query all GitHub sources belonging to the user via the GitHub REST API.
4. Builds a `ReportTemplateData` object and renders it via `PdfService` (Handlebars template → Puppeteer → PDF buffer).
5. Dispatches the PDF buffer via `NotificationDispatcher.dispatchFile()`.
6. Updates `last_sent_at`.

### 4.8 `notification`

`NotificationDispatcher` is a cross-domain service. It has two methods:

- `dispatch(credentials, text)` — sends a plain-text message.
- `dispatchFile(credentials, buffer, filename, caption)` — sends a file attachment.

Routing is done by `credentials.provider`. Adding a new provider means extending this dispatcher and the `ConnectionCredentialsSchema` union.

---

## 5. Infrastructure Layer

Located at `src/modules/infra/`. Each adapter implements a domain-owned interface so use cases stay decoupled from libraries.

| Interface | Implementation | Description |
|-----------|---------------|-------------|
| `InfraPasswordHasherInterface` | `InfraPasswordBcryptImplementation` | bcrypt password hashing (rounds = 12) |
| `InfraEmailSenderInterface` | `InfraEmailNodemailerImplementation` | Nodemailer SMTP email delivery |
| `InfraEncryptionInterface` | `InfraCryptoAesImplementation` | AES-256-GCM encryption / decryption |
| `TransactionManagerInterface` | `TransactionManager` | Acquires a `pg` client, runs a callback in `BEGIN`/`COMMIT`/`ROLLBACK` |

`TransactionManagerInterface.runInTransaction<T>(callback: (client) => Promise<T>): Promise<T>`

Repositories and use cases instantiated inside a `runInTransaction` callback must be created with the transactional `client`:

```typescript
return this.txManager.runInTransaction(async (client) => {
    const repo = RepositoryUserWriter.create(client);
    const useCase = UserUpdateNameUseCase.create(repo, ...);
    return useCase.execute(...);
});
```

---

## 6. Authentication & Security

### JWT tokens

| Token | Location | Lifetime |
|-------|----------|----------|
| Access token | Response body | Short (configurable via `ACCESS_TOKEN_SECRET` secret, default minutes) |
| Refresh token | `httpOnly` cookie (`refreshToken`) | Long-lived |

`authMiddleware` verifies the Bearer access token and populates `req.user.sub` with the user ID. Protected routes all go through this middleware.

`UserIdExtractor` reads `req.user.sub` and throws `AppError(401)` if missing.

### Password storage

Passwords are hashed with **bcrypt** (cost factor 12). The raw password is never stored. For password reset and change operations, the hash of the previously set password is stored in `last_password_hash` to prevent immediate re-use.

### Credential encryption

Connection credentials (Telegram bot tokens, Slack tokens, email addresses, GitHub PATs) are encrypted with **AES-256-GCM** before being written to the database. The nonce is prepended to the ciphertext. Decryption happens only when the credentials are needed at runtime (dispatching a notification or making a GitHub API call).

### CORS

Allowed origins are hard-coded in `src/app.ts`:

```typescript
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:9000",
];
```

Update this list to match your deployment origin.

---

## 7. Background Workers

Workers are bootstrapped in `src/workers/worker.bootstrap.ts` and started by `src/index.ts` alongside the HTTP server.

### GitHub poll worker

Uses **BullMQ** with a repeating job (`every: GITHUB_POLL_INTERVAL_MS`).

On each tick:

1. Loads all active subscriptions from the database.
2. For each subscription, `GithubPollWorker.processSubscription()`:
   a. Decrypts the GitHub access token (if present).
   b. Calls the appropriate `GithubPollerService.poll*()` method.
   c. If new events are found, renders the message template and dispatches via `NotificationDispatcher`.
   d. Updates `last_seen` on the subscription.

All subscriptions are processed concurrently with `Promise.allSettled` — a failure in one does not block the others.

**Bootstrap semantics:** On the very first poll for a subscription, the poller records the current state without firing any notifications. This prevents a flood of old events when a subscription is first created.

**`last_seen` checkpoint format by event type:**

| Event | `last_seen` keys |
|-------|-----------------|
| `new_release` | `latest_release_id`, `__bootstrapped` |
| `new_commit` | `sha`, `__bootstrapped` |
| `new_branch` | `branches[]`, `__bootstrapped` |
| `new_tag` | `tags[]`, `__bootstrapped` |
| `issue_opened` | `latest_issue_id`, `__bootstrapped` |
| `issue_closed` | `last_closed_at`, `__bootstrapped` |
| `pr_opened` | `latest_pr_id`, `__bootstrapped` |
| `pr_merged` | `merged_pr_ids[]`, `__bootstrapped` |
| `workflow_completed` | `latest_run_id`, `__bootstrapped` |
| `star_milestone` | `stars`, `__bootstrapped` |
| `fork_milestone` | `forks`, `__bootstrapped` |

### Report worker

A second BullMQ worker runs on the `report-scheduler` queue. On each tick it queries all active `ReportConfig` rows and calls `GenerateReportService.generateForConfig()` for those that are due (`ReportConfig.isDue(now)`). The PDF is generated with Puppeteer from a Handlebars template (`src/modules/report/pdf/templates/report.hbs`).

---

## 8. Database

PostgreSQL is used as the primary data store. Migrations are managed with `node-pg-migrate`.

### Running migrations

```bash
npm run migrate
```

### Schema summary

| Table | Key columns |
|-------|------------|
| `users` | `id`, `email`, `password_hash`, `name`, `is_verified`, `is_deleted`, `pending_email`, `last_password_hash`, `pending_password_hash` |
| `connections` | `id`, `user_id`, `provider`, `name`, `credentials` (encrypted JSON), `is_deleted` |
| `github_sources` | `id`, `user_id`, `repo_owner`, `repo_name`, `access_token` (encrypted) |
| `github_subscriptions` | `id`, `github_source_id`, `event_type`, `connection_id`, `message_template`, `config`, `last_seen`, `is_active` |
| `report_configurations` | `id`, `user_id`, `connection_id`, `frequency`, `schedule_day`, `is_active`, `last_sent_at` |
| `verification_tokens` | `id`, `user_id`, `token_hash`, `type`, `expires_at`, `used_at` |
| `refresh_tokens` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at` |

### PostgreSQL error mapping

`src/modules/errors/mapper.database.ts` maps PostgreSQL error codes to HTTP status codes:

| pg code | HTTP | Meaning |
|---------|------|---------|
| `23505` | `409` | Unique constraint violation |
| `23503` | `400` | Foreign key violation |
| `23502` | `400` | Not-null constraint violation |

Any unmapped `pg` error is re-thrown as a `DatabaseError`, which the `errorsMiddleware` maps to `500`.

---

## 9. Rate Limiting

Rate limiting is implemented with `@vpro3611/req-shield` (token-bucket algorithm, state stored in Redis).

`constructMiddlewareWrapper(bucket, keyStrategy, redisPrefix)` builds an Express middleware. Key strategies:

| Strategy | Description |
|----------|-------------|
| `'ip'` | Keyed by client IP |
| `'email+ip'` | Keyed by `body.email + IP` |
| `'cookieToken'` | Keyed by `refreshToken` cookie value |

Bucket presets (all defined in `src/api_limiter.ts`):

| Endpoint | Capacity | Refill | Interval |
|----------|----------|--------|----------|
| `POST /pub/auth/register` | 5 | 5 | 60 s |
| `POST /pub/auth/register/confirm` | 5 | 5 | 5 min |
| `POST /pub/auth/login` | 5 | 1 | 15 s |
| `POST /pub/auth/refresh` | 10 | 1 | 5 s |
| `POST /pub/auth/logout` | 20 | 5 | 60 s |
| `POST /pub/user/password-reset` | 3 | 3 | 5 min |
| `POST /pub/user/password-reset/confirm` | 5 | 5 | 5 min |

---

## 10. Error Handling

### `AppError`

Use `throwAppError(message, statusCode, source)` to raise a domain error. The `source` field is a dot-path string (e.g. `UserDomain.ensureActiveAndVerified`) used for logging.

```typescript
throwAppError('User is not verified.', 403, 'UserDomain.canLogin');
```

### `DatabaseError`

Wraps unexpected PostgreSQL errors. Mapped to `500` by `errorsMiddleware`.

### `errorsMiddleware`

Registered last in `src/app.ts`. Mapping:

| Error type | HTTP status |
|-----------|------------|
| `ZodError` | `400` |
| `AppError` | `error.statusCode` |
| `DatabaseError` | `500` |
| Unknown | `500` |

---

## 11. Dependency Injection

EDAE uses **manual constructor injection** — no IoC container framework. The composition root is `src/container.ts` (`createDepsContainer()`), which wires every dependency and returns a `DepsContainer` typed object.

The `DepsContainer` is passed to `createApp()`, which distributes controllers to routes. Workers receive only the slices they need (`db`, `encryption`, `emailSender`).

All classes expose a static `create(...args)` factory instead of `new` — this ensures instantiation always goes through validation and makes mocking in tests straightforward.

---

## 12. Testing Strategy

| Test type | Location | Strategy |
|-----------|----------|----------|
| Entity unit | `tests/modules/<domain>/entity/` | No mocks; exercise domain class directly |
| Use case unit | `tests/modules/<domain>/usecases/` | Mock repo + infra interfaces with `jest.fn()` |
| Transactional service unit | `tests/modules/<domain>/transactional_services/` | `jest.mock()` static-factory classes; verify transaction called, args forwarded, errors propagate |
| Repository integration | `tests/modules/<domain>/repository/` | Real PostgreSQL against `TEST_DATABASE_URL`; seed in `beforeAll`, close pool in `afterAll` |
| DTO mapper unit | `tests/modules/<domain>/dto/` | No mocks; exercise mapper directly |
| Controller e2e | `tests/modules/<domain>/controllers/` | `supertest` against real Express app; real controllers + mocked tx services; covers success, 400 validation, 401 guard, AppError propagation |

**Coverage threshold:** 90% on statements, branches, functions, and lines (enforced via `jest.config.js`).

**`buildContainer()` helper** — each e2e test file constructs a `DepsContainer`-shaped object with real controllers wrapping mocked services. `JwtTokenService` runs for real so auth middleware is exercised against genuine signed tokens.

**Factory helpers** (e.g. `createValidUser()`) are co-located with the test file to reduce fixture boilerplate.

---

## 13. Adding a New Module

Follow this checklist when adding a new domain module:

1. **Create the directory** `src/modules/<domain>/` with the standard sub-folders.
2. **Define the entity** in `entity/<domain>.ts`. Add guard methods for invalid-state operations. Add a companion `*Validator` class.
3. **Define repository interfaces** (reader + writer) in `interfaces/interface.repository.ts`.
4. **Implement repositories** against the interfaces using `pg.Pool` or `pg.PoolClient`. Use `handleDatabaseError()` from `src/modules/errors/mapper.database.ts` to translate pg errors.
5. **Write use cases** in `usecases/`. Each use case: validate input → fetch → guard → mutate → persist. Use injected interfaces, never `pool` directly.
6. **Define the DTO** in `dto/<domain>.dto.ts` and the mapper in `dto/<domain>.dto.mapper.ts`.
7. **Write transactional services** in `transactional_services/`. Use `txManager.runInTransaction()` and instantiate repos/use cases with the transactional `client`.
8. **Write controllers** in `controllers/`. Export the Zod body schema alongside the controller class.
9. **Register routes** in `src/app.ts`.
10. **Wire dependencies** in `src/container.ts` and add the controller to the returned object.
11. **Write tests** covering all four layers (entity, use case, tx service, controller e2e).
12. **Add a migration** for any new tables via `npm run migrate`.
