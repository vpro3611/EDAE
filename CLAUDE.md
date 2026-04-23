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

Clean Architecture with a modules-based structure. Currently only the `user` domain module exists; future modules follow the same layout under `src/modules/`.

### Layer order (outer → inner)

```
src/modules/<domain>/
├── interfaces/   ← repository contracts (reader/writer split)
├── repository/   ← PostgreSQL implementations of those contracts
├── usecases/     ← orchestrate domain mutations via repo + infra
└── entity/       ← domain object + validator (no I/O)

src/modules/infra/<concern>/  ← cross-cutting infrastructure (e.g. password hashing)
src/modules/errors/           ← AppError, DatabaseError, handleDatabaseError()
src/database.ts               ← exports a shared pg.Pool
src/container.ts              ← wires all dependencies together
```

### Key conventions

**Repositories** are split into a reader (`UserRepoReaderInterface`) and a writer (`UserRepoWriterInterface`). PostgreSQL error codes are mapped to HTTP status codes in `src/modules/errors/mapper.database.ts` via `handleDatabaseError()`.

**Entities** are mutable domain objects with guard methods (e.g. `ensureActiveAndVerified()`) that throw before any state change is allowed on deleted or unverified users. Validation lives in a companion `*Validator` class.

**Use cases** follow a strict sequence: validate input → fetch user → call entity guard/mutation → persist via repository. They never touch the database directly.

**Infrastructure adapters** (e.g. `InfraPasswordBcryptImplementation`) implement a domain-owned interface so use cases stay decoupled from bcrypt.

### Testing patterns

| Test type | Location | Strategy |
|-----------|----------|----------|
| Entity unit | `tests/modules/<domain>/entity/` | No mocks; exercise domain class directly |
| Use case unit | `tests/modules/<domain>/usecases/` | Mock repo + infra interfaces with `jest.fn()` |
| Repository integration | `tests/modules/<domain>/repository/` | Real PostgreSQL; seed in `beforeAll`, close pool in `afterAll` |

Factory helpers (e.g. `createValidUser`) are co-located in test files to reduce boilerplate.

### Commit style

Conventional commits scoped to the domain: `feat(user):`, `refactor(user):`, `test(user):`, `chore:`.
