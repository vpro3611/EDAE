# Connections Module Design

**Date:** 2026-04-27
**Branch:** feat/conn

## Overview

A DDD-style `connection` domain module that lets users manage notification channels (Telegram, Slack, Email). Follows the `user` module architecture exactly: entity → validator → interfaces → repositories → use cases → transactional services → controllers → DTOs.

---

## Credentials Types

Defined in `src/modules/connection/connection.credentials.ts`.

```ts
export type TelegramCredentials = { provider: 'telegram'; bot_token: string; chat_id: string };
export type SlackCredentials    = { provider: 'slack';    webhook_url: string };
export type EmailCredentials    = { provider: 'email';    address: string };
export type ConnectionCredentials = TelegramCredentials | SlackCredentials | EmailCredentials;
```

The `provider` discriminant appears both inside the credentials union and as a top-level DB column. This allows SQL filtering on `provider` without decrypting, and lets the validator verify the two values agree.

---

## Entity & Validator

### `Connection` entity (`src/modules/connection/entity/connection.ts`)

Fields: `id`, `user_id`, `provider`, `name`, `credentials: ConnectionCredentials`, `created_at`, `updated_at`, `is_deleted`.

Static factories:
- `createForDatabase(userId, provider, name, credentials)` — returns plain insert-ready object
- `restore(...)` — validates name + credentials, returns entity instance

Guard methods:
- `ensureNotDeleted(op)` — throws `AppError` 400 if `is_deleted`
- `ensureOwnership(actorId, op)` — throws `AppError` 403 if `user_id !== actorId`

Mutation methods:
- `updateName(name)` — validates then mutates
- `updateCredentials(creds)` — validates shape then mutates *(TODO: check provider availability)*
- `softDelete()` — sets `is_deleted = true`
- `restore()` — sets `is_deleted = false` *(TODO: check provider availability)*

### `ConnectionValidator` (`src/modules/connection/entity/connection.validator.ts`)

- `validateName(name)` — 1–100 chars, throws 400 on violation
- `validateCredentials(creds)` — discriminated switch per provider:
  - `telegram`: `bot_token` and `chat_id` non-empty strings
  - `slack`: `webhook_url` valid URL format
  - `email`: `address` valid email format

---

## Infra: Encryption Adapter

New adapter at `src/modules/infra/encryption/`.

**`InfraEncryptionInterface`**
```ts
encrypt(plaintext: string): string;
decrypt(ciphertext: string): string;
```

**`InfraCryptoAesImplementation`**
- Algorithm: AES-256-GCM
- Key: `process.env.ENCRYPTION_KEY` (32-byte hex string)
- Format: `iv:authTag:ciphertext` (all hex), colon-separated
- Each `encrypt` call generates a fresh random 12-byte IV

Repositories call `encryption.encrypt(JSON.stringify(credentials))` on write and `JSON.parse(encryption.decrypt(row.credentials))` on read. Credentials never reach the DB in plaintext.

---

## Repository Interfaces & Implementations

### `interface.repository.ts` (`src/modules/connection/interfaces/`)

```ts
// Reader
getConnectionById(id: string): Promise<Connection | null>;
getActiveConnectionsByUserId(userId: string): Promise<Connection[]>;
getDeletedConnectionsByUserId(userId: string): Promise<Connection[]>;

// Writer
createConnection(data: { user_id: string; provider: string; name: string; credentials_encrypted: string }): Promise<void>;
updateConnection(connection: Connection): Promise<void>;
softDeleteConnection(id: string): Promise<void>;
restoreConnection(id: string): Promise<void>;
```

### Implementations (`src/modules/connection/repository/`)

- `RepositoryConnectionReader` — accepts `Pool | PoolClient`, static `create()`, decrypts credentials after each query via injected `InfraEncryptionInterface`, calls `Connection.restore()`
- `RepositoryConnectionWriter` — accepts `Pool | PoolClient`, static `create()`, encrypts credentials before SQL, wraps all queries in `handleDatabaseError()`

---

## Use Cases

All in `src/modules/connection/usecases/`. Each has a static `create()` factory and takes reader + writer + encryption (where needed) as constructor args.

| Use Case | Key logic |
|---|---|
| `ConnectionCreateUseCase` | Validate → `createForDatabase` → writer. **TODO: check availability before persist** |
| `ConnectionListActiveUseCase` | `getActiveConnectionsByUserId` → map to DTO |
| `ConnectionListDeletedUseCase` | `getDeletedConnectionsByUserId` → map to DTO |
| `ConnectionUpdateUseCase` | Fetch → `ensureOwnership` → `ensureNotDeleted` → `updateName` and/or `updateCredentials` → `updateConnection`. **TODO on credentials change** |
| `ConnectionSoftDeleteUseCase` | Fetch → `ensureOwnership` → `ensureNotDeleted` → `softDelete()` → `softDeleteConnection` |
| `ConnectionRestoreUseCase` | Fetch → `ensureOwnership` → `restore()` → `restoreConnection`. **TODO: check availability before persist** |

---

## Transactional Services

All in `src/modules/connection/transactional_services/`. Thin wrappers — each instantiates repos + use case inside `txManager.runInTransaction()`.

One `TxService*` per use case:
`TxServiceConnectionCreate`, `TxServiceConnectionListActive`, `TxServiceConnectionListDeleted`, `TxServiceConnectionUpdate`, `TxServiceConnectionSoftDelete`, `TxServiceConnectionRestore`.

---

## DTOs

`src/modules/connection/dto/connection.dto.ts`:
```ts
export type ConnectionDto = {
    id: string;
    user_id: string;
    provider: string;
    name: string;
    credentials: ConnectionCredentials;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
}
```

`ConnectionDtoMapper` (`connection.dto.mapper.ts`) — single `mapToDto(connection: Connection): ConnectionDto` method, static `create()` factory.

---

## Controllers & Routes

All in `src/modules/connection/controllers/`. All routes are mounted on the existing `privateRouter` (behind `authMiddleware`).

| Controller | Method | Route |
|---|---|---|
| `ControllerConnectionCreate` | `POST` | `/protected/connections` |
| `ControllerConnectionListActive` | `GET` | `/protected/connections` |
| `ControllerConnectionListDeleted` | `GET` | `/protected/connections/deleted` |
| `ControllerConnectionUpdate` | `PATCH` | `/protected/connections/:id` |
| `ControllerConnectionSoftDelete` | `DELETE` | `/protected/connections/:id` |
| `ControllerConnectionRestore` | `POST` | `/protected/connections/:id/restore` |

Each controller: validates body via Zod + `validateBody()`, extracts actor id via `UserIdExtractor`, delegates to tx service, returns JSON response.

---

## Testing

| Layer | Strategy |
|---|---|
| Entity unit | Guards, mutations, validator per-provider shapes — no mocks |
| Use case unit | Mock reader/writer/encryption with `jest.fn()`; cover 403 ownership, 404 not found, 400 deleted, happy path |
| Tx service unit | `jest.mock()` static factories; verify transaction called, args forwarded, errors propagate |
| Repository integration | Real PostgreSQL; encrypt-on-write / decrypt-on-read round-trip; seed in `beforeAll`, close pool in `afterAll` |
| Controller e2e | `supertest` + mocked tx services; covers 200, 400 validation, 401 auth, 403 ownership, 404, AppError propagation |

Coverage threshold: 90% (statements, branches, functions, lines) per existing `jest.config.js`.

---

## Files to Create

```
src/modules/connection/connection.credentials.ts
src/modules/connection/entity/connection.ts
src/modules/connection/entity/connection.validator.ts
src/modules/connection/interfaces/interface.repository.ts
src/modules/connection/repository/repository.connection.reader.ts
src/modules/connection/repository/repository.connection.writer.ts
src/modules/connection/usecases/connection.create.usecase.ts
src/modules/connection/usecases/connection.list_active.usecase.ts
src/modules/connection/usecases/connection.list_deleted.usecase.ts
src/modules/connection/usecases/connection.update.usecase.ts
src/modules/connection/usecases/connection.soft_delete.usecase.ts
src/modules/connection/usecases/connection.restore.usecase.ts
src/modules/connection/transactional_services/tx_service.connection.create.ts
src/modules/connection/transactional_services/tx_service.connection.list_active.ts
src/modules/connection/transactional_services/tx_service.connection.list_deleted.ts
src/modules/connection/transactional_services/tx_service.connection.update.ts
src/modules/connection/transactional_services/tx_service.connection.soft_delete.ts
src/modules/connection/transactional_services/tx_service.connection.restore.ts
src/modules/connection/dto/connection.dto.ts
src/modules/connection/dto/connection.dto.mapper.ts
src/modules/connection/controllers/controller.connection.create.ts
src/modules/connection/controllers/controller.connection.list_active.ts
src/modules/connection/controllers/controller.connection.list_deleted.ts
src/modules/connection/controllers/controller.connection.update.ts
src/modules/connection/controllers/controller.connection.soft_delete.ts
src/modules/connection/controllers/controller.connection.restore.ts
src/modules/infra/encryption/infra.encryption.interface.ts
src/modules/infra/encryption/infra.encryption_aes.implementation.ts

tests/modules/connection/entity/connection.test.ts
tests/modules/connection/usecases/connection.create.test.ts
tests/modules/connection/usecases/connection.list_active.test.ts
tests/modules/connection/usecases/connection.list_deleted.test.ts
tests/modules/connection/usecases/connection.update.test.ts
tests/modules/connection/usecases/connection.soft_delete.test.ts
tests/modules/connection/usecases/connection.restore.test.ts
tests/modules/connection/transactional_services/tx_service.connection.create.test.ts
tests/modules/connection/transactional_services/tx_service.connection.list_active.test.ts
tests/modules/connection/transactional_services/tx_service.connection.list_deleted.test.ts
tests/modules/connection/transactional_services/tx_service.connection.update.test.ts
tests/modules/connection/transactional_services/tx_service.connection.soft_delete.test.ts
tests/modules/connection/transactional_services/tx_service.connection.restore.test.ts
tests/modules/connection/repository/repository.connection.test.ts
tests/modules/connection/controllers/controller.connection.test.ts
```

Files to modify: `src/container.ts`, `src/app.ts`
