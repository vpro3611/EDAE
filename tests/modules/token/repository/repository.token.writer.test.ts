import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryTokenWriter } from '../../../../src/modules/token/repository/repository.token.writer';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';

dotenv.config();

describe('RepositoryTokenWriter Integration Test', () => {
    let pool: Pool;
    let writer: RepositoryTokenWriter;
    let userId: string;

    beforeAll(async () => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        writer = new RepositoryTokenWriter(pool);

        await pool.query('DELETE FROM verification_tokens');
        await pool.query('DELETE FROM users');

        const result = await pool.query(
            "INSERT INTO users (name, email, password_hashed, last_password, is_verified) VALUES ($1,$2,$3,$4,$5) RETURNING id",
            ['Token Writer User', 'tokenwriter@example.com', 'hash', 'hash', true]
        );
        userId = result.rows[0].id;
    });

    afterAll(async () => {
        await pool.end();
    });

    beforeEach(async () => {
        await pool.query('DELETE FROM verification_tokens');
    });

    describe('createToken', () => {
        it('should insert a row in verification_tokens', async () => {
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await writer.createToken({ user_id: userId, otp_hash: 'testhash', purpose: TokenPurpose.REGISTRATION, expires_at: expiresAt });

            const result = await pool.query('SELECT * FROM verification_tokens WHERE user_id = $1', [userId]);
            expect(result.rows.length).toBe(1);
            expect(result.rows[0].otp_hash).toBe('testhash');
            expect(result.rows[0].purpose).toBe(TokenPurpose.REGISTRATION);
            expect(result.rows[0].is_used).toBe(false);
        });
    });

    describe('invalidatePreviousTokens', () => {
        it('should mark all active tokens for user+purpose as used', async () => {
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await pool.query(
                "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1,$2,$3,$4),($1,$5,$3,$4)",
                [userId, 'hash1', TokenPurpose.REGISTRATION, expiresAt, 'hash2']
            );

            await writer.invalidatePreviousTokens(userId, TokenPurpose.REGISTRATION);

            const result = await pool.query('SELECT is_used FROM verification_tokens WHERE user_id = $1', [userId]);
            expect(result.rows.every((r: any) => r.is_used)).toBe(true);
        });

        it('should not affect tokens of a different purpose', async () => {
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await pool.query(
                "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1,$2,$3,$4)",
                [userId, 'keep_hash', TokenPurpose.DELETE_ACCOUNT, expiresAt]
            );

            await writer.invalidatePreviousTokens(userId, TokenPurpose.REGISTRATION);

            const result = await pool.query(
                "SELECT is_used FROM verification_tokens WHERE purpose = $1",
                [TokenPurpose.DELETE_ACCOUNT]
            );
            expect(result.rows[0].is_used).toBe(false);
        });
    });

    describe('markTokenAsUsed', () => {
        it('should set is_used = true for the given token id', async () => {
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            const insertResult = await pool.query(
                "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1,$2,$3,$4) RETURNING id",
                [userId, 'markhash', TokenPurpose.REGISTRATION, expiresAt]
            );
            const tokenId = insertResult.rows[0].id;

            await writer.markTokenAsUsed(tokenId);

            const result = await pool.query('SELECT is_used FROM verification_tokens WHERE id = $1', [tokenId]);
            expect(result.rows[0].is_used).toBe(true);
        });
    });
});
