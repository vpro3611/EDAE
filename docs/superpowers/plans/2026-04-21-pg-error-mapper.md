# PostgreSQL Error Mapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a universal PostgreSQL error mapper that transforms technical database errors into human-readable messages while integrating with the existing `DatabaseError` class.

**Architecture:** A utility function `handleDatabaseError` in `src/modules/errors/mapper.database.ts` that uses a combination of `switch` statements for error codes and regex-based detail parsing for specific high-priority cases.

**Tech Stack:** TypeScript, `pg` (PostgreSQL client), Jest (for testing).

---

### Task 1: Create the Mapper Utility

**Files:**
- Create: `src/modules/errors/mapper.database.ts`
- Test: `src/modules/errors/mapper.database.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { handleDatabaseError } from './mapper.database';
import { DatabaseError } from './errors.database';

describe('handleDatabaseError', () => {
    it('should map unique violation (23505) for email', () => {
        const pgError = {
            code: '23505',
            detail: 'Key (email)=(test@example.com) already exists.',
            message: 'duplicate key value violates unique constraint "users_email_key"'
        };
        try {
            handleDatabaseError(pgError, 'UserRepo.create');
        } catch (e) {
            expect(e).toBeInstanceOf(DatabaseError);
            const dbErr = e as DatabaseError;
            expect(dbErr.message).toBe('The email already exists.');
            expect(dbErr.statusCode).toBe(409);
            expect(dbErr.internalError).toBe('UserRepo.create');
        }
    });

    it('should map foreign key violation (23503)', () => {
        const pgError = {
            code: '23503',
            detail: 'Key (user_id)=(123) is not present in table "users".',
            message: 'insert or update on table "connections" violates foreign key constraint'
        };
        try {
            handleDatabaseError(pgError, 'ConnRepo.create');
        } catch (e) {
            const dbErr = e as DatabaseError;
            expect(dbErr.message).toBe('The referenced user_id does not exist.');
            expect(dbErr.statusCode).toBe(404);
        }
    });

    it('should fall back to original message for unknown codes', () => {
        const pgError = {
            code: '99999',
            message: 'Some strange pg error'
        };
        try {
            handleDatabaseError(pgError, 'Test.method');
        } catch (e) {
            const dbErr = e as DatabaseError;
            expect(dbErr.message).toBe('Some strange pg error');
            expect(dbErr.statusCode).toBe(500);
        }
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test src/modules/errors/mapper.database.test.ts`
Expected: FAIL (Module not found)

- [ ] **Step 3: Implement the mapper utility**

```typescript
import { throwDatabaseError } from './errors.database';

export function handleDatabaseError(err: any, context: string): never {
    const code = err.code;
    const detail = err.detail || '';
    const message = err.message || 'A database error occurred.';

    switch (code) {
        case '23505': { // Unique Violation
            const fieldMatch = detail.match(/Key \((.*?)\)=/);
            const field = fieldMatch ? fieldMatch[1] : 'record';
            throwDatabaseError(`The ${field} already exists.`, 409, context, message);
        }
        case '23503': { // Foreign Key Violation
            const fieldMatch = detail.match(/Key \((.*?)\)=/);
            const field = fieldMatch ? fieldMatch[1] : 'reference';
            throwDatabaseError(`The referenced ${field} does not exist.`, 404, context, message);
        }
        case '23502': { // Not Null Violation
            const field = err.column || 'field';
            throwDatabaseError(`The ${field} is required.`, 400, context, message);
        }
        case '42703': { // Undefined Column
            throwDatabaseError('Technical error: Invalid data structure.', 500, context, message);
        }
        default:
            throwDatabaseError(message, 500, context, message);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test src/modules/errors/mapper.database.test.ts`
Expected: PASS

- [ ] **Step 5: No commit (as per user request)**

---

### Task 2: Integration Research (User Reader)

**Files:**
- Read: `src/modules/user/repository/repository.user.reader.ts`

- [ ] **Step 1: Read repository to identify query points**

Run: `cat src/modules/user/repository/repository.user.reader.ts`
