# Design Spec: Universal PG Error Mapper

## 1. Problem Statement
The current system catches raw PostgreSQL errors which are cryptic and hard for users to understand. We need a utility that maps these technical errors into human-readable messages while preserving debugging context.

## 2. Architecture & Data Flow
The mapper will be a pure utility function that transforms a `pg.Error` into a `DatabaseError` (defined in `src/modules/errors/errors.database.ts`).

### Data Flow
1. **Trigger**: A repository method catches an error from `pool.query()`.
2. **Input**: The raw `err` object and a `context` string (e.g., `UserRepo.create`).
3. **Processing**:
   - Identify PG error code.
   - For priority codes (Unique, Foreign Key, Not Null), parse `detail` or `column` fields.
   - Generate "humanic" message.
4. **Output**: Call `throwDatabaseError` which halts execution.

## 3. Error Code Mapping Table

| PG Code | Description | Human Message | Status |
| :--- | :--- | :--- | :--- |
| `23505` | Unique Violation | "The [field] already exists." | 409 |
| `23503` | FK Violation | "The referenced [field] does not exist." | 404 |
| `23502` | Not Null | "The [field] is required." | 400 |
| `42703` | Undefined Column | "Technical error: Invalid data structure." | 500 |
| `Default`| Any other code | `err.message` | 500 |

## 4. Technical Details

### Location
`src/modules/errors/mapper.database.ts`

### Interface
```typescript
function handleDatabaseError(err: any, context: string): never
```

### Parsing Logic (Regex)
For `23505` (Unique):
`Key (email)=(test@example.com) already exists.` -> extract `email`.

For `23503` (FK):
`Key (user_id)=(...) is not present in table "users".` -> extract `user_id`.

## 5. Testing Strategy
- Unit tests for the mapper utility using mocked PG error objects.
- Integration tests in `UserRepo` to ensure real DB collisions trigger the correct human-readable error.
