import { handleDatabaseError } from '../../../src/modules/errors/mapper.database';
import { DatabaseError } from '../../../src/modules/errors/errors.database';

describe('handleDatabaseError', () => {
    const context = 'TestContext';

    it('should throw DatabaseError for unique violation (23505)', () => {
        const pgError = {
            code: '23505',
            detail: 'Key (email)=(test@example.com) already exists.',
            message: 'duplicate key value violates unique constraint'
        };

        try {
            handleDatabaseError(pgError, context);
        } catch (error) {
            expect(error).toBeInstanceOf(DatabaseError);
            const dbError = error as DatabaseError;
            expect(dbError.message).toBe('The email already exists.');
            expect(dbError.statusCode).toBe(409);
            expect(dbError.internalError).toBe(context);
            expect(dbError.originalErrorMessage).toBe(pgError.message);
        }
    });

    it('should throw DatabaseError for foreign key violation (23503)', () => {
        const pgError = {
            code: '23503',
            detail: 'Key (user_id)=(123) is not present in table "users".',
            message: 'insert or update on table "posts" violates foreign key constraint'
        };

        try {
            handleDatabaseError(pgError, context);
        } catch (error) {
            expect(error).toBeInstanceOf(DatabaseError);
            const dbError = error as DatabaseError;
            expect(dbError.message).toBe('The referenced user_id does not exist.');
            expect(dbError.statusCode).toBe(404);
            expect(dbError.internalError).toBe(context);
            expect(dbError.originalErrorMessage).toBe(pgError.message);
        }
    });

    it('should throw DatabaseError for not null violation (23502)', () => {
        const pgError = {
            code: '23502',
            column: 'username',
            message: 'null value in column "username" violates not-null constraint'
        };

        try {
            handleDatabaseError(pgError, context);
        } catch (error) {
            expect(error).toBeInstanceOf(DatabaseError);
            const dbError = error as DatabaseError;
            expect(dbError.message).toBe('The username is required.');
            expect(dbError.statusCode).toBe(400);
            expect(dbError.internalError).toBe(context);
            expect(dbError.originalErrorMessage).toBe(pgError.message);
        }
    });

    it('should throw DatabaseError for undefined column (42703)', () => {
        const pgError = {
            code: '42703',
            message: 'column "nonexistent" of relation "users" does not exist'
        };

        try {
            handleDatabaseError(pgError, context);
        } catch (error) {
            expect(error).toBeInstanceOf(DatabaseError);
            const dbError = error as DatabaseError;
            expect(dbError.message).toBe('Technical error: Invalid data structure.');
            expect(dbError.statusCode).toBe(500);
            expect(dbError.internalError).toBe(context);
            expect(dbError.originalErrorMessage).toBe(pgError.message);
        }
    });

    it('should throw DatabaseError with default message for unknown error code', () => {
        const pgError = {
            code: '99999',
            message: 'Some unknown error'
        };

        try {
            handleDatabaseError(pgError, context);
        } catch (error) {
            expect(error).toBeInstanceOf(DatabaseError);
            const dbError = error as DatabaseError;
            expect(dbError.message).toBe('Some unknown error');
            expect(dbError.statusCode).toBe(500);
            expect(dbError.internalError).toBe(context);
            expect(dbError.originalErrorMessage).toBe(pgError.message);
        }
    });
});
