import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryUserReader } from '../../../../src/modules/user/repository/repository.user.reader';
import { User } from '../../../../src/modules/user/entity/user';

dotenv.config();

describe('RepositoryUserReader Integration Test', () => {
    let pool: Pool;
    let reader: RepositoryUserReader;
    let activeUserId: string;
    let deletedUserId: string;
    let unverifiedUserId: string;

    const activeUserEmail = 'active@example.com';
    const deletedUserEmail = 'deleted@example.com';
    const unverifiedUserEmail = 'unverified@example.com';

    beforeAll(async () => {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        reader = new RepositoryUserReader(pool);

        // Clean up and seed
        await pool.query('DELETE FROM users');

        const activeResult = await pool.query(
            "INSERT INTO users (name, email, password_hashed, is_deleted, is_verified, last_password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            ['Active User', activeUserEmail, 'Password123!@#', false, true, 'Password123!@#']
        );
        activeUserId = activeResult.rows[0].id;

        const deletedResult = await pool.query(
            "INSERT INTO users (name, email, password_hashed, is_deleted, is_verified, last_password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            ['Deleted User', deletedUserEmail, 'Password123!@#', true, true, 'Password123!@#']
        );
        deletedUserId = deletedResult.rows[0].id;

        const unverifiedResult = await pool.query(
            "INSERT INTO users (name, email, password_hashed, is_deleted, is_verified, last_password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            ['Unverified User', unverifiedUserEmail, 'Password123!@#', false, false, 'Password123!@#']
        );
        unverifiedUserId = unverifiedResult.rows[0].id;
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('getUserById', () => {
        it('should return a User instance for a valid ID', async () => {
            const user = await reader.getUserById(activeUserId);
            expect(user).toBeInstanceOf(User);
            expect(user?.id).toBe(activeUserId);
            expect(user?.email).toBe(activeUserEmail);
            expect(user?.is_verified).toBe(true);
        });

        it('should return null for an invalid/non-existent ID', async () => {
            const invalidId = '00000000-0000-0000-0000-000000000000';
            const user = await reader.getUserById(invalidId);
            expect(user).toBeNull();
        });

        it('should return null for a deleted user ID', async () => {
            const user = await reader.getUserById(deletedUserId);
            expect(user).toBeNull();
        });
    });

    describe('getUserByEmail', () => {
        it('should return a User instance for a valid email', async () => {
            const user = await reader.getUserByEmail(activeUserEmail);
            expect(user).toBeInstanceOf(User);
            expect(user?.email).toBe(activeUserEmail);
        });

        it('should return null for an invalid email', async () => {
            const invalidEmail = 'nonexistent@example.com';
            const user = await reader.getUserByEmail(invalidEmail);
            expect(user).toBeNull();
        });

        it('should return null for a deleted user email', async () => {
            const user = await reader.getUserByEmail(deletedUserEmail);
            expect(user).toBeNull();
        });
    });

    describe('error handling', () => {
        it('should throw DatabaseError on database failure in getUserById', async () => {
            const badReader = new RepositoryUserReader({
                query: () => Promise.reject(new Error('simulated db error'))
            } as any);

            await expect(badReader.getUserById('uuid')).rejects.toThrow();
        });

        it('should throw DatabaseError on database failure in getUserByEmail', async () => {
            const badReader = new RepositoryUserReader({
                query: () => Promise.reject(new Error('simulated db error'))
            } as any);

            await expect(badReader.getUserByEmail('email')).rejects.toThrow();
        });

        it('should throw DatabaseError on database failure in getNonDeletedUsers', async () => {
            const badReader = new RepositoryUserReader({
                query: () => Promise.reject(new Error('simulated db error'))
            } as any);

            await expect(badReader.getNonDeletedUsers()).rejects.toThrow();
        });

        it('should throw DatabaseError on database failure in getVerifiedUsers', async () => {
            const badReader = new RepositoryUserReader({
                query: () => Promise.reject(new Error('simulated db error'))
            } as any);

            await expect(badReader.getVerifiedUsers()).rejects.toThrow();
        });
    });

    describe('getNonDeletedUsers', () => {
        it('should return only non-deleted users (active + unverified)', async () => {
            const users = await reader.getNonDeletedUsers();
            expect(users.length).toBe(2);
            const ids = users.map(u => u.id);
            expect(ids).toContain(activeUserId);
            expect(ids).toContain(unverifiedUserId);
            expect(ids).not.toContain(deletedUserId);
        });
    });

    describe('getVerifiedUsers', () => {
        it('should return only verified non-deleted users', async () => {
            const users = await reader.getVerifiedUsers();
            expect(users.length).toBe(1);
            expect(users[0].id).toBe(activeUserId);
            expect(users[0].is_verified).toBe(true);
            expect(users[0].is_deleted).toBe(false);
        });
    });
});
