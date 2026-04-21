import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryUserReader } from '../../../../src/modules/user/repository/repository.user.reader';
import { DatabaseError } from '../../../../src/modules/errors/errors.database';
import { User } from '../../../../src/modules/user/entity/user';

dotenv.config();

describe('RepositoryUserReader Integration Test', () => {
    let pool: Pool;
    let reader: RepositoryUserReader;
    let activeUserId: string;
    let deletedUserId: string;

    const activeUserEmail = 'active@example.com';
    const deletedUserEmail = 'deleted@example.com';

    beforeAll(async () => {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        reader = new RepositoryUserReader(pool);

        // Clean up and seed
        await pool.query('DELETE FROM users');

        const activeResult = await pool.query(
            "INSERT INTO users (name, email, password_hashed, is_deleted) VALUES ($1, $2, $3, $4) RETURNING id",
            ['Active User', activeUserEmail, 'Password123!@#', false]
        );
        activeUserId = activeResult.rows[0].id;

        const deletedResult = await pool.query(
            "INSERT INTO users (name, email, password_hashed, is_deleted) VALUES ($1, $2, $3, $4) RETURNING id",
            ['Deleted User', deletedUserEmail, 'Password123!@#', true]
        );
        deletedUserId = deletedResult.rows[0].id;
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('create static method', () => {
        it('should instantiate the repository', () => {
            const newReader = RepositoryUserReader.create(pool);
            expect(newReader).toBeInstanceOf(RepositoryUserReader);
        });
    });

    describe('getUserById', () => {
        it('should return a User instance for a valid ID', async () => {
            const user = await reader.getUserById(activeUserId);
            expect(user).toBeInstanceOf(User);
            expect(user.id).toBe(activeUserId);
            expect(user.email).toBe(activeUserEmail);
        });

        it('should throw a DatabaseError for an invalid ID', async () => {
            const invalidId = '00000000-0000-0000-0000-000000000000';
            try {
                await reader.getUserById(invalidId);
                throw new Error('Should have thrown a DatabaseError');
            } catch (error: any) {
                expect(error).toBeInstanceOf(DatabaseError);
                expect(error.statusCode).toBe(500);
            }
        });
    });

    describe('getUserByEmail', () => {
        it('should return a User instance for a valid email', async () => {
            const user = await reader.getUserByEmail(activeUserEmail);
            expect(user).toBeInstanceOf(User);
            expect(user.email).toBe(activeUserEmail);
        });

        it('should throw a DatabaseError for an invalid email', async () => {
            const invalidEmail = 'nonexistent@example.com';
            try {
                await reader.getUserByEmail(invalidEmail);
                throw new Error('Should have thrown a DatabaseError');
            } catch (error: any) {
                expect(error).toBeInstanceOf(DatabaseError);
                expect(error.statusCode).toBe(500);
                // Verify it's the property access error
                expect(error.originalErrorMessage).toMatch(/reading 'id'/);
            }
        });
    });

    describe('getNonDeletedUsers', () => {
        it('should return only non-deleted users', async () => {
            const users = await reader.getNonDeletedUsers();
            expect(users.length).toBe(1);
            expect(users[0].id).toBe(activeUserId);
            expect(users[0].is_deleted).toBe(false);
        });

        it('should throw DatabaseError on database failure', async () => {
            const badReader = new RepositoryUserReader({
                query: () => Promise.reject(new Error('simulated db error'))
            } as any);

            try {
                await badReader.getNonDeletedUsers();
                throw new Error('Should have thrown');
            } catch (error: any) {
                expect(error).toBeInstanceOf(DatabaseError);
                expect(error.internalError).toBe('RepositoryUserReader');
            }
        });
    });
});
