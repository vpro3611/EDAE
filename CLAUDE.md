# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # tsx watch — hot-reload via src/index.ts
npm run build        # tsc — compile to dist/
npm run start        # node dist/index.js — run compiled output

# Testing
npm test             # jest — run all tests
npm run test:watch   # jest --watch
npm run test:ci      # jest --runInBand (sequential, for CI)

# Run a single test file
npx jest tests/modules/user/entity/user.test.ts

# Database migrations
npm run migrate      # node-pg-migrate -j ts
```

Requires `DATABASE_URL` and `TEST_DATABASE_URL` in `.env` (see `.env` for local values).

## Architecture

Clean Architecture with a modules-based structure. Active domain modules: `user`, `token`, `authentification`. Future modules follow the same layout under `src/modules/`.

### Layer order (outer → inner)

```
src/modules/<domain>/
├── interfaces/              ← repository contracts (reader/writer split)
├── repository/              ← PostgreSQL implementations of those contracts
├── usecases/                ← orchestrate domain mutations via repo + infra
├── entity/                  ← domain object + validator (no I/O)
├── dto/                     ← output shapes returned to callers (user domain)
└── transactional_services/  ← wrap use cases in a DB transaction (user domain)

src/modules/authentification/          ← AuthentificationService (register/login/refresh/logout)
src/modules/authentification/jwt/      ← JwtTokenService, JwtRefreshTokenRepository, config
src/modules/infra/<concern>/           ← cross-cutting infrastructure
  ├── password/              ← InfraPasswordHasherInterface + bcrypt implementation
  ├── email/                 ← InfraEmailSenderInterface + nodemailer implementation
  └── transaction_manager/   ← TransactionManagerInterface + pg implementation
src/modules/errors/          ← AppError, DatabaseError, handleDatabaseError()
src/database.ts              ← exports a shared pg.Pool
src/container.ts             ← wires all dependencies together
```

### Key conventions

**Repositories** are split into a reader (`UserRepoReaderInterface`) and a writer (`UserRepoWriterInterface`). PostgreSQL error codes are mapped to HTTP status codes in `src/modules/errors/mapper.database.ts` via `handleDatabaseError()`.

**Entities** are mutable domain objects with guard methods (e.g. `ensureActiveAndVerified()`, `canLogin()`) that throw before any state change is allowed on deleted or unverified users. Validation lives in a companion `*Validator` class.

**Use cases** follow a strict sequence: validate input → fetch user → call entity guard/mutation → persist via repository. They never touch the database directly. Use cases that return user data return `UserDtoForSelf` via `UserDtoMapper`, not raw entity objects.

**Transactional services** (`TxService*`) are thin orchestration wrappers that run one or more use cases inside a single DB transaction via `TransactionManagerInterface.runInTransaction()`. Repositories and use cases are instantiated inside the callback using their static `create(client)` factory methods — they cannot be constructor-injected.

**Infrastructure adapters** (e.g. `InfraPasswordBcryptImplementation`) implement a domain-owned interface so use cases stay decoupled from concrete libraries.

**Authentication** is handled by `AuthentificationService`, which orchestrates `registerRequest`, `registerConfirm`, `loginEmail`, `refresh`, and `logout`. Refresh tokens are hashed with SHA-256 before being stored in the `refresh_tokens` table. Access tokens are short-lived JWTs; refresh tokens are long-lived JWTs whose hashes are stored for revocation.

### Testing patterns

| Test type | Location | Strategy |
|-----------|----------|----------|
| Entity unit | `tests/modules/<domain>/entity/` | No mocks; exercise domain class directly |
| Use case unit | `tests/modules/<domain>/usecases/` | Mock repo + infra interfaces with `jest.fn()` |
| Transactional service unit | `tests/modules/<domain>/transactional_services/` | `jest.mock()` on static-factory classes (repos + use cases); verify transaction called, args forwarded, errors propagate |
| Repository integration | `tests/modules/<domain>/repository/` | Real PostgreSQL; seed in `beforeAll`, close pool in `afterAll` |
| DTO mapper unit | `tests/modules/<domain>/dto/` | No mocks; exercise mapper directly |

Factory helpers (e.g. `createValidUser`) are co-located in test files to reduce boilerplate.

### Commit style

Conventional commits scoped to the domain: `feat(user):`, `feat(infra):`, `feat(auth):`, `refactor(user):`, `test(user):`, `chore:`.
