# OTP Email Verification — Design Spec

**Date:** 2026-04-22
**Branch:** feat/user-actions
**Status:** Approved

---

## Overview

Add email verification via 6-digit numeric OTP to four flows: registration, forgot-password (reset), change email, and account deletion. Each flow is split into a **Request** use case (generates + sends OTP) and a **Confirm** use case (verifies OTP + executes domain action).

---

## Module Structure

### New: `src/modules/token/`

Owns the full OTP lifecycle — entity, interfaces, repository, and use cases.

```
src/modules/token/
├── entity/
│   └── token.ts                       # OtpToken entity + TokenPurpose enum
├── interfaces/
│   └── interface.repository.ts        # TokenRepoReaderInterface, TokenRepoWriterInterface
├── repository/
│   ├── repository.token.reader.ts
│   └── repository.token.writer.ts
└── usecases/
    ├── token.create_otp.usecase.ts
    └── token.verify_otp.usecase.ts
```

### New: `src/modules/infra/email/`

Mirrors the existing `infra/password/` pattern.

```
src/modules/infra/email/
├── infra.email_sender.interface.ts
└── infra.email_nodemailer.implementation.ts
```

### User module additions

```
src/modules/user/
├── entity/
│   └── user.ts                                          # gains pending_email field + updatePendingEmail()
└── usecases/
    ├── user.delete_user.usecase.ts                      # renamed → user.request_account_deletion.usecase.ts
    ├── user.confirm_account_deletion.usecase.ts         # new
    ├── user.request_registration_verification.usecase.ts  # new
    ├── user.confirm_registration.usecase.ts             # new
    ├── user.request_password_reset.usecase.ts           # new
    ├── user.confirm_password_reset.usecase.ts           # new
    ├── user.request_email_change.usecase.ts             # new
    └── user.confirm_email_change.usecase.ts             # new
```

### Migrations (2 new)

1. Add `pending_email VARCHAR(255) NULL DEFAULT NULL` to `users` table
2. Create `verification_tokens` table

---

## Token Module

### `TokenPurpose` enum

```typescript
enum TokenPurpose {
    REGISTRATION    = 'registration',
    RESET_PASSWORD  = 'reset_password',
    CHANGE_EMAIL    = 'change_email',
    DELETE_ACCOUNT  = 'delete_account',
}
```

### `OtpToken` entity

| Field       | Type              | Notes                        |
|-------------|-------------------|------------------------------|
| id          | string (UUID)     | PK                           |
| user_id     | string (UUID)     | FK → users.id ON DELETE CASCADE |
| otp_hash    | string            | SHA-256 hash of plain OTP    |
| purpose     | TokenPurpose      |                              |
| expires_at  | Date              | 15 minutes from creation     |
| is_used     | boolean           | default false                |
| created_at  | Date              |                              |

**Static methods:**
- `OtpToken.generate(): string` — returns a cryptographically random 6-digit numeric string (e.g. `"048291"`) via `crypto.randomInt`
- `OtpToken.hash(plain: string): string` — SHA-256 via Node `crypto` (not bcrypt — OTPs are short-lived and already random; bcrypt overhead is unnecessary here)
- `OtpToken.createForDatabase(userId, purpose, otpHash, ttlMinutes)` — returns plain object for persistence

**Instance methods:**
- `isExpired(): boolean` — `expires_at < new Date()`
- `assertValid(): void` — throws `AppError` 400 if `is_used` or `isExpired()`

### Repository interfaces

```typescript
interface TokenRepoReaderInterface {
    getActiveToken(userId: string, purpose: TokenPurpose): Promise<OtpToken | null>
}

interface TokenRepoWriterInterface {
    createToken(data: { user_id, otp_hash, purpose, expires_at }): Promise<void>
    invalidatePreviousTokens(userId: string, purpose: TokenPurpose): Promise<void>
    markTokenAsUsed(id: string): Promise<void>
}
```

### `CreateOtpUseCase.execute(userId, recipientEmail, purpose)`

1. Call `invalidatePreviousTokens(userId, purpose)` — one active token per user per purpose
2. `OtpToken.generate()` → plain OTP
3. `OtpToken.hash(plain)` → otp_hash
4. `createToken({ user_id, otp_hash, purpose, expires_at: now + 15 min })`
5. Call appropriate `InfraEmailSenderInterface` method with `recipientEmail` and plain OTP
6. Returns `void` — plain OTP never leaves this use case

**Dependencies:** `TokenRepoWriterInterface`, `InfraEmailSenderInterface`

### `VerifyOtpUseCase.execute(userId, purpose, plainOtp)`

1. `getActiveToken(userId, purpose)` — if null → throw 400 "No active verification code found"
2. `token.assertValid()` — throws if expired or already used
3. Compare `OtpToken.hash(plainOtp)` vs `token.otp_hash` — throw 400 "Invalid or expired verification code" on mismatch
4. `markTokenAsUsed(token.id)`
5. Returns `void`

**Dependencies:** `TokenRepoReaderInterface`, `TokenRepoWriterInterface`

### Database table: `verification_tokens`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
otp_hash    VARCHAR(255) NOT NULL
purpose     VARCHAR(50) NOT NULL
expires_at  TIMESTAMPTZ NOT NULL
is_used     BOOLEAN NOT NULL DEFAULT false
created_at  TIMESTAMPTZ NOT NULL DEFAULT current_timestamp

INDEX ON (user_id, purpose)
```

---

## Email Infrastructure

### `InfraEmailSenderInterface`

One method per flow — allows each email to have its own subject and body copy independently:

```typescript
interface InfraEmailSenderInterface {
    sendRegistrationOtp(to: string, otp: string): Promise<void>
    sendPasswordResetOtp(to: string, otp: string): Promise<void>
    sendEmailChangeOtp(to: string, otp: string): Promise<void>
    sendAccountDeletionOtp(to: string, otp: string): Promise<void>
}
```

### `InfraEmailNodemailerImplementation`

- Package: `nodemailer` + `@types/nodemailer` (new dependency)
- Constructor accepts `host, port, user, pass` — injected via `container.ts` from env vars already present: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- Sends plain-text emails only at this stage
- Follows the same `static create(...)` factory pattern as `InfraPasswordBcryptImplementation`

---

## User Use Case Flows

All new use cases follow the existing constructor injection + `static create()` pattern.

### Registration

**`RequestRegistrationVerificationUseCase.execute(userId: string)`**
1. `getUserById(userId)` — throw 404 if not found
2. Guard: if `user.is_verified` → throw 400 "User is already verified"
3. `CreateOtpUseCase.execute(userId, user.email, TokenPurpose.REGISTRATION)`

**`ConfirmRegistrationUseCase.execute(userId: string, otp: string)`**
1. `getUserById(userId)` — throw 404 if not found
2. Guard: if `user.is_verified` → throw 400 "User is already verified"
3. `VerifyOtpUseCase.execute(userId, TokenPurpose.REGISTRATION, otp)`
4. `markUserAsVerified(userId)`

---

### Reset Password (forgot-password)

**`RequestPasswordResetUseCase.execute(email: string)`**
1. `UserValidator.validateEmail(email)`
2. `getUserByEmail(email)` — throw 404 if not found
3. `CreateOtpUseCase.execute(user.id, email, TokenPurpose.RESET_PASSWORD)`

**`ConfirmPasswordResetUseCase.execute(email: string, otp: string, newPassword: string)`**
1. `UserValidator.validateEmail(email)` + `UserValidator.validatePassword(newPassword)`
2. `getUserByEmail(email)` — throw 404 if not found
3. `VerifyOtpUseCase.execute(user.id, TokenPurpose.RESET_PASSWORD, otp)`
4. Hash new password via `InfraPasswordHasherInterface`
5. `user.resetPassword(newPasswordHashed)` — new entity method, skips `ensureActiveAndVerified` guard (recovery path — user may be unverified/locked out)
6. `updateUser(user)`

---

### Change Email

**`RequestEmailChangeUseCase.execute(userId: string, newEmail: string)`**
1. `UserValidator.validateEmail(newEmail)` — early validation before DB hit
2. `getUserById(userId)` — throw 404 if not found
3. `user.updatePendingEmail(newEmail)` — internally calls `ensureActiveAndVerified` + `validateEmail`
4. `updateUser(user)` — persist `pending_email`
5. `CreateOtpUseCase.execute(userId, newEmail, TokenPurpose.CHANGE_EMAIL)` — OTP sent to **new** email

**`ConfirmEmailChangeUseCase.execute(userId: string, otp: string)`**
1. `getUserById(userId)` — throw 404 if not found
2. Guard: if `user.pending_email === null` → throw 400 "No pending email change"
3. `VerifyOtpUseCase.execute(userId, TokenPurpose.CHANGE_EMAIL, otp)`
4. `user.updateEmail(user.pending_email)`
5. `user.updatePendingEmail(null)`
6. `updateUser(user)`

---

### Account Deletion

**`RequestAccountDeletionUseCase.execute(userId: string)`** *(refactored from `DeleteUserUseCase`)*
1. `getUserById(userId)` — throw 404 if not found
2. `user.assertDelete()` — throw 400 if already deleted
3. `CreateOtpUseCase.execute(userId, user.email, TokenPurpose.DELETE_ACCOUNT)`

**`ConfirmAccountDeletionUseCase.execute(userId: string, otp: string)`**
1. `getUserById(userId)` — throw 404 if not found
2. `user.assertDelete()` — throw 400 if already deleted
3. `VerifyOtpUseCase.execute(userId, TokenPurpose.DELETE_ACCOUNT, otp)`
4. `deleteUser(userId)`

---

## Entity Changes

### `User` entity

- Add field: `public pending_email: string | null`
- Add method: `updatePendingEmail(email: string | null): void` — calls `ensureActiveAndVerified`, then `UserValidator.validateEmail(email)` when non-null
- Add method: `resetPassword(hash: string): void` — updates `password_hashed` and `last_password` **without** `ensureActiveAndVerified`; reserved for the forgot-password recovery path only
- Update `restoreUser(...)` static to accept and pass through `pending_email`
- Update `UserRepoWriterInterface.updateUser` and its SQL to include `pending_email`

---

## Testing Strategy

| Layer | Type | Approach |
|---|---|---|
| `OtpToken` entity | Unit | No mocks; test `generate()` format, `isExpired()`, `assertValid()` throws |
| `CreateOtpUseCase` | Unit | Mock `TokenRepoWriterInterface` + `InfraEmailSenderInterface`; verify call order |
| `VerifyOtpUseCase` | Unit | Mock `TokenRepoReaderInterface` + writer; test expired/used/mismatch paths |
| Token repository | Integration | Real PostgreSQL; seed tokens, assert reads and state transitions |
| User use cases (new) | Unit | Mock all deps; verify orchestration and guard paths |
| `InfraEmailNodemailerImplementation` | Manual / excluded | SMTP side-effects; not unit tested |

---

## Dependencies to Add

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```
