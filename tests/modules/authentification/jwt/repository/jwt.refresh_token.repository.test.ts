import dotenv from 'dotenv';
import { Pool } from 'pg';
import { JwtRefreshTokenRepository } from '../../../../../src/modules/authentification/jwt/repository/jwt.refresh_token.repository';

dotenv.config();

describe('JwtRefreshTokenRepository Integration Test', () => {
    let pool: Pool;
    let repository: JwtRefreshTokenRepository;
    let userId: string;

    const validHash = 'valid-hash-integration';
    const expiredHash = 'expired-hash-integration';
    const revokedHash = 'revoked-hash-integration';
    const revokeByHashTarget = 'revoke-by-hash-target';
    const revokeByIdHash = 'revoke-by-id-target';
    let revokeByIdTokenId: string;

    beforeAll(async () => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        repository = JwtRefreshTokenRepository.create(pool);

        await pool.query('DELETE FROM refresh_tokens');
        await pool.query("DELETE FROM users WHERE email = $1", ['jwt-repo-test@example.com']);

        const userResult = await pool.query(
            "INSERT INTO users (name, email, password_hashed, is_deleted, is_verified, last_password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            ['JWT Repo Test User', 'jwt-repo-test@example.com', 'hashed', false, true, 'hashed']
        );
        userId = userResult.rows[0].id;

        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
            [userId, validHash, new Date(Date.now() + 3_600_000)]
        );

        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
            [userId, expiredHash, new Date(Date.now() - 1_000)]
        );

        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at, revoked_at) VALUES ($1, $2, $3, now())",
            [userId, revokedHash, new Date(Date.now() + 3_600_000)]
        );

        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
            [userId, revokeByHashTarget, new Date(Date.now() + 3_600_000)]
        );

        const revokeByIdResult = await pool.query(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id",
            [userId, revokeByIdHash, new Date(Date.now() + 3_600_000)]
        );
        revokeByIdTokenId = revokeByIdResult.rows[0].id;
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('create', () => {
        it('inserts a token that can subsequently be retrieved by hash', async () => {
            const hash = 'create-integration-hash';
            await repository.create({ userId, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });

            const result = await repository.findValidByHash(hash);

            expect(result).not.toBeNull();
            expect(result?.userId).toBe(userId);
            expect(result?.tokenHash).toBe(hash);
            expect(result?.revokedAt).toBeNull();
            expect(result?.id).toBeDefined();
            expect(result?.expiresAt).toBeInstanceOf(Date);
            expect(result?.createdAt).toBeInstanceOf(Date);
        });
    });

    describe('findValidByHash', () => {
        it('returns a complete DTO for a valid non-expired non-revoked token', async () => {
            const result = await repository.findValidByHash(validHash);

            expect(result).not.toBeNull();
            expect(result?.userId).toBe(userId);
            expect(result?.tokenHash).toBe(validHash);
            expect(result?.revokedAt).toBeNull();
            expect(result?.id).toBeDefined();
            expect(result?.expiresAt).toBeInstanceOf(Date);
            expect(result?.createdAt).toBeInstanceOf(Date);
        });

        it('returns null when the hash does not exist', async () => {
            const result = await repository.findValidByHash('nonexistent-hash');
            expect(result).toBeNull();
        });

        it('returns null for an expired token', async () => {
            const result = await repository.findValidByHash(expiredHash);
            expect(result).toBeNull();
        });

        it('returns null for a revoked token', async () => {
            const result = await repository.findValidByHash(revokedHash);
            expect(result).toBeNull();
        });
    });

    describe('revokeByHash', () => {
        it('makes the token unretrievable after revocation', async () => {
            expect(await repository.findValidByHash(revokeByHashTarget)).not.toBeNull();

            await repository.revokeByHash(revokeByHashTarget);

            expect(await repository.findValidByHash(revokeByHashTarget)).toBeNull();
        });
    });

    describe('revokeById', () => {
        it('makes the token unretrievable after revocation by id', async () => {
            expect(await repository.findValidByHash(revokeByIdHash)).not.toBeNull();

            await repository.revokeById(revokeByIdTokenId);

            expect(await repository.findValidByHash(revokeByIdHash)).toBeNull();
        });
    });

    describe('error handling', () => {
        const badRepo = () =>
            new JwtRefreshTokenRepository({ query: () => Promise.reject(new Error('db error')) } as any);

        it('throws on db failure in create', async () => {
            await expect(
                badRepo().create({ userId, tokenHash: 'x', expiresAt: new Date() })
            ).rejects.toThrow();
        });

        it('throws on db failure in findValidByHash', async () => {
            await expect(badRepo().findValidByHash('x')).rejects.toThrow();
        });

        it('throws on db failure in revokeByHash', async () => {
            await expect(badRepo().revokeByHash('x')).rejects.toThrow();
        });

        it('throws on db failure in revokeById', async () => {
            await expect(badRepo().revokeById('x')).rejects.toThrow();
        });
    });
});
