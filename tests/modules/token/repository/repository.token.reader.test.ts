import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryTokenReader } from '../../../../src/modules/token/repository/repository.token.reader';
import { OtpToken, TokenPurpose } from '../../../../src/modules/token/entity/token';

dotenv.config();

describe('RepositoryTokenReader Integration Test', () => {
    let pool: Pool;
    let reader: RepositoryTokenReader;
    let userId: string;

    beforeAll(async () => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        reader = new RepositoryTokenReader(pool);

        await pool.query('DELETE FROM verification_tokens');
        await pool.query('DELETE FROM users');

        const result = await pool.query(
            "INSERT INTO users (name, email, password_hashed, last_password, is_verified) VALUES ($1,$2,$3,$4,$5) RETURNING id",
            ['Token Test User', 'tokenreader@example.com', 'hash', 'hash', true]
        );
        userId = result.rows[0].id;

        // Active registration token
        await pool.query(
            "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1,$2,$3,$4)",
            [userId, 'active_hash', TokenPurpose.REGISTRATION, new Date(Date.now() + 15 * 60 * 1000)]
        );
        // Used reset_password token
        await pool.query(
            "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at, is_used) VALUES ($1,$2,$3,$4,$5)",
            [userId, 'used_hash', TokenPurpose.RESET_PASSWORD, new Date(Date.now() + 15 * 60 * 1000), true]
        );
        // Expired change_email token
        await pool.query(
            "INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1,$2,$3,$4)",
            [userId, 'expired_hash', TokenPurpose.CHANGE_EMAIL, new Date(Date.now() - 1000)]
        );
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('getActiveToken', () => {
        it('should return an OtpToken for an active, non-expired token', async () => {
            const token = await reader.getActiveToken(userId, TokenPurpose.REGISTRATION);
            expect(token).toBeInstanceOf(OtpToken);
            expect(token?.user_id).toBe(userId);
            expect(token?.purpose).toBe(TokenPurpose.REGISTRATION);
            expect(token?.otp_hash).toBe('active_hash');
        });

        it('should return null for a used token', async () => {
            const token = await reader.getActiveToken(userId, TokenPurpose.RESET_PASSWORD);
            expect(token).toBeNull();
        });

        it('should return null for an expired token', async () => {
            const token = await reader.getActiveToken(userId, TokenPurpose.CHANGE_EMAIL);
            expect(token).toBeNull();
        });

        it('should return null for a purpose with no token', async () => {
            const token = await reader.getActiveToken(userId, TokenPurpose.DELETE_ACCOUNT);
            expect(token).toBeNull();
        });

        it('should return null for a non-existent user', async () => {
            const token = await reader.getActiveToken('00000000-0000-0000-0000-000000000000', TokenPurpose.REGISTRATION);
            expect(token).toBeNull();
        });
    });
});
