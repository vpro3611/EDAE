import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryGithubSourceReader } from '../../../../src/modules/github_source/repository/repository.github_source.reader';
import { RepositoryGithubSourceWriter } from '../../../../src/modules/github_source/repository/repository.github_source.writer';
import { InfraCryptoAesImplementation } from '../../../../src/modules/infra/encryption/infra.encryption_aes.implementation';
import { GithubSource } from '../../../../src/modules/github_source/entity/github_source';

dotenv.config();

describe('RepositoryGithubSource Integration Tests', () => {
    let pool: Pool;
    let reader: RepositoryGithubSourceReader;
    let writer: RepositoryGithubSourceWriter;
    let testUserId: string;

    beforeAll(async () => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const encryption = InfraCryptoAesImplementation.create(process.env.ENCRYPTION_KEY!);
        reader = RepositoryGithubSourceReader.create(pool, encryption);
        writer = RepositoryGithubSourceWriter.create(pool, encryption);

        // Clean up any leftover user from a previous interrupted run before inserting
        await pool.query('DELETE FROM users WHERE email = $1', ['gs-repo-test@example.com']);

        const userResult = await pool.query(
            `INSERT INTO users (name, email, password_hashed, last_password, is_verified)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            ['Test User', 'gs-repo-test@example.com', 'HashedPwd1!', 'HashedPwd1!', true],
        );
        testUserId = userResult.rows[0].id;

        await pool.query('DELETE FROM github_sources WHERE user_id = $1', [testUserId]);
    });

    afterAll(async () => {
        await pool.query('DELETE FROM github_sources WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await pool.end();
    });

    describe('createSource + getSourceById', () => {
        it('creates a source with an access_token and reads it back with the token decrypted', async () => {
            const created = await writer.createSource({
                user_id: testUserId,
                repo_owner: 'octocat',
                repo_name: 'hello-world',
                access_token: 'ghp_test_token_123',
            });

            expect(created).toBeInstanceOf(GithubSource);
            expect(created.user_id).toBe(testUserId);
            expect(created.repo_owner).toBe('octocat');
            expect(created.repo_name).toBe('hello-world');
            expect(created.access_token).toBe('ghp_test_token_123');
            expect(created.id).toBeDefined();
            expect(created.created_at).toBeInstanceOf(Date);
            expect(created.updated_at).toBeInstanceOf(Date);

            const fetched = await reader.getSourceById(created.id);
            expect(fetched).toBeInstanceOf(GithubSource);
            expect(fetched?.id).toBe(created.id);
            expect(fetched?.user_id).toBe(testUserId);
            expect(fetched?.repo_owner).toBe('octocat');
            expect(fetched?.repo_name).toBe('hello-world');
            expect(fetched?.access_token).toBe('ghp_test_token_123');

            // cleanup for subsequent tests
            await writer.deleteSource(created.id);
        });

        it('creates a source with null access_token and reads it back with access_token null', async () => {
            const created = await writer.createSource({
                user_id: testUserId,
                repo_owner: 'octocat',
                repo_name: 'public-repo',
                access_token: null,
            });

            expect(created).toBeInstanceOf(GithubSource);
            expect(created.access_token).toBeNull();

            const fetched = await reader.getSourceById(created.id);
            expect(fetched).toBeInstanceOf(GithubSource);
            expect(fetched?.access_token).toBeNull();

            await writer.deleteSource(created.id);
        });

        it('returns null for a non-existent UUID', async () => {
            const result = await reader.getSourceById('00000000-0000-0000-0000-000000000000');
            expect(result).toBeNull();
        });
    });

    describe('getSourcesByUserId', () => {
        beforeEach(async () => {
            await pool.query('DELETE FROM github_sources WHERE user_id = $1', [testUserId]);
        });

        it('returns all sources for a user ordered by created_at ASC', async () => {
            const first = await writer.createSource({
                user_id: testUserId,
                repo_owner: 'owner-a',
                repo_name: 'repo-a',
                access_token: 'token-a',
            });

            // small delay to ensure distinct created_at values
            await new Promise(resolve => setTimeout(resolve, 10));

            const second = await writer.createSource({
                user_id: testUserId,
                repo_owner: 'owner-b',
                repo_name: 'repo-b',
                access_token: null,
            });

            const sources = await reader.getSourcesByUserId(testUserId);
            expect(sources).toHaveLength(2);
            expect(sources[0]).toBeInstanceOf(GithubSource);
            expect(sources[1]).toBeInstanceOf(GithubSource);
            expect(sources[0].id).toBe(first.id);
            expect(sources[1].id).toBe(second.id);
            expect(sources[0].access_token).toBe('token-a');
            expect(sources[1].access_token).toBeNull();
            // verify ASC order
            expect(sources[0].created_at.getTime()).toBeLessThanOrEqual(sources[1].created_at.getTime());
        });

        it('returns an empty array for a user with no sources', async () => {
            const sources = await reader.getSourcesByUserId(testUserId);
            expect(sources).toEqual([]);
        });
    });

    describe('deleteSource', () => {
        beforeEach(async () => {
            await pool.query('DELETE FROM github_sources WHERE user_id = $1', [testUserId]);
        });

        it('source is no longer findable after delete', async () => {
            const created = await writer.createSource({
                user_id: testUserId,
                repo_owner: 'octocat',
                repo_name: 'to-delete',
                access_token: 'ghp_to_delete',
            });

            await writer.deleteSource(created.id);

            const fetched = await reader.getSourceById(created.id);
            expect(fetched).toBeNull();
        });

        it('getSourcesByUserId excludes deleted sources', async () => {
            const kept = await writer.createSource({
                user_id: testUserId,
                repo_owner: 'octocat',
                repo_name: 'kept-repo',
                access_token: null,
            });
            const deleted = await writer.createSource({
                user_id: testUserId,
                repo_owner: 'octocat',
                repo_name: 'deleted-repo',
                access_token: null,
            });

            await writer.deleteSource(deleted.id);

            const sources = await reader.getSourcesByUserId(testUserId);
            expect(sources).toHaveLength(1);
            expect(sources[0].id).toBe(kept.id);
            expect(sources[0].repo_name).toBe('kept-repo');
        });
    });
});
