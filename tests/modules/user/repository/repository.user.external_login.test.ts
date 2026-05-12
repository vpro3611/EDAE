import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryUserExternalLogin } from '../../../../src/modules/user/repository/repository.user.external_login';

dotenv.config();

describe('RepositoryUserExternalLogin Integration Test', () => {
    let pool: Pool;
    let repo: RepositoryUserExternalLogin;
    let testUserId: string;

    const provider = 'google';
    const externalId = 'google-oauth2|123456789';

    beforeAll(async () => {
        pool = new Pool({
            connectionString: process.env.TEST_DATABASE_URL,
        });
        repo = RepositoryUserExternalLogin.create(pool);

        // Seed a user to satisfy the foreign key constraint
        const userResult = await pool.query(
            "INSERT INTO users (name, email, password_hashed, is_deleted, is_verified, last_password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            ['External Login Test User', 'external_login_test@example.com', 'Password123!@#', false, true, 'Password123!@#']
        );
        testUserId = userResult.rows[0].id;
    });

    afterAll(async () => {
        // Clean up seeded data
        await pool.query('DELETE FROM user_external_logins WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await pool.end();
    });

    describe('findByProviderAndExternalId', () => {
        it('should return null when no record exists', async () => {
            const result = await repo.findByProviderAndExternalId('google', 'nonexistent-external-id');
            expect(result).toBeNull();
        });

        it('should return user_id when record exists', async () => {
            // Insert a record first
            await pool.query(
                "INSERT INTO user_external_logins (user_id, provider, external_id) VALUES ($1, $2, $3)",
                [testUserId, provider, externalId]
            );

            const result = await repo.findByProviderAndExternalId(provider, externalId);
            expect(result).toBe(testUserId);

            // Clean up for next tests
            await pool.query(
                'DELETE FROM user_external_logins WHERE user_id = $1 AND provider = $2 AND external_id = $3',
                [testUserId, provider, externalId]
            );
        });
    });

    describe('create', () => {
        it('should insert a new record', async () => {
            const newExternalId = 'google-oauth2|new-999';

            await repo.create(testUserId, provider, newExternalId);

            const result = await pool.query(
                'SELECT user_id FROM user_external_logins WHERE provider = $1 AND external_id = $2',
                [provider, newExternalId]
            );
            expect(result.rows.length).toBe(1);
            expect(result.rows[0].user_id).toBe(testUserId);
        });
    });

    describe('error handling', () => {
        it('should throw on database failure in findByProviderAndExternalId', async () => {
            const badRepo = new RepositoryUserExternalLogin({
                query: () => Promise.reject(new Error('simulated db error'))
            } as any);

            await expect(badRepo.findByProviderAndExternalId('google', 'id')).rejects.toThrow();
        });

        it('should throw on database failure in create', async () => {
            const badRepo = new RepositoryUserExternalLogin({
                query: () => Promise.reject(new Error('simulated db error'))
            } as any);

            await expect(badRepo.create('user-id', 'google', 'ext-id')).rejects.toThrow();
        });
    });
});
