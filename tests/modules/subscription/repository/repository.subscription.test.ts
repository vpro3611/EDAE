import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositorySubscriptionReader } from '../../../../src/modules/subscription/repository/repository.subscription.reader';
import { RepositorySubscriptionWriter } from '../../../../src/modules/subscription/repository/repository.subscription.writer';
import { InfraCryptoAesImplementation } from '../../../../src/modules/infra/encryption/infra.encryption_aes.implementation';
import { Subscription } from '../../../../src/modules/subscription/entity/subscription';

dotenv.config();

describe('RepositorySubscription Integration Tests', () => {
    let pool: Pool;
    let reader: RepositorySubscriptionReader;
    let writer: RepositorySubscriptionWriter;
    let encryption: InfraCryptoAesImplementation;

    let testUserId: string;
    let testSourceId: string;
    let testConnectionId: string;

    beforeAll(async () => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        encryption = InfraCryptoAesImplementation.create(process.env.ENCRYPTION_KEY!);
        reader = RepositorySubscriptionReader.create(pool, encryption);
        writer = RepositorySubscriptionWriter.create(pool);

        // Seed test user
        const userResult = await pool.query(
            `INSERT INTO users (name, email, password_hashed, last_password, is_verified)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            ['Test User', 'sub-repo-test@example.com', 'HashedPwd1!', 'HashedPwd1!', true],
        );
        testUserId = userResult.rows[0].id;

        // Seed test github_source with encrypted access token
        const encryptedToken = encryption.encrypt('ghp_test_access_token_123');
        const sourceResult = await pool.query(
            `INSERT INTO github_sources (user_id, repo_owner, repo_name, access_token_encrypted)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, repo_owner, repo_name) DO UPDATE SET access_token_encrypted = EXCLUDED.access_token_encrypted
             RETURNING id`,
            [testUserId, 'test-owner', 'test-repo', encryptedToken],
        );
        testSourceId = sourceResult.rows[0].id;

        // Seed test connection
        const encryptedCreds = encryption.encrypt(JSON.stringify({ provider: 'email', address: 'test@test.com' }));
        const connResult = await pool.query(
            `INSERT INTO connections (user_id, provider, name, credentials)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [testUserId, 'email', 'Test Email', { e: encryptedCreds }],
        );
        testConnectionId = connResult.rows[0].id;

        // Clear any leftover subscriptions for this source
        await pool.query('DELETE FROM github_subscriptions WHERE github_source_id = $1', [testSourceId]);
    });

    afterAll(async () => {
        // FK order: subscriptions → sources → connections → users
        await pool.query('DELETE FROM github_subscriptions WHERE github_source_id = $1', [testSourceId]);
        await pool.query('DELETE FROM github_sources WHERE id = $1', [testSourceId]);
        await pool.query('DELETE FROM connections WHERE id = $1', [testConnectionId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await pool.end();
    });

    describe('createSubscription + getSubscriptionById', () => {
        let createdId: string;

        it('creates a subscription and reads it back — all fields match', async () => {
            const created = await writer.createSubscription({
                github_source_id: testSourceId,
                event_type: 'new_release',
                connection_id: testConnectionId,
                message_template: 'New release: {version}',
                config: { notify_prereleases: false },
            });

            expect(created).toBeInstanceOf(Subscription);
            expect(created.github_source_id).toBe(testSourceId);
            expect(created.event_type).toBe('new_release');
            expect(created.connection_id).toBe(testConnectionId);
            expect(created.message_template).toBe('New release: {version}');
            expect(created.config).toEqual({ notify_prereleases: false });
            expect(created.last_seen).toEqual({});
            expect(created.is_active).toBe(true);
            expect(created.id).toBeDefined();
            expect(created.created_at).toBeInstanceOf(Date);
            expect(created.updated_at).toBeInstanceOf(Date);

            createdId = created.id;

            const fetched = await reader.getSubscriptionById(createdId);
            expect(fetched).toBeInstanceOf(Subscription);
            expect(fetched?.id).toBe(createdId);
            expect(fetched?.github_source_id).toBe(testSourceId);
            expect(fetched?.event_type).toBe('new_release');
            expect(fetched?.connection_id).toBe(testConnectionId);
            expect(fetched?.message_template).toBe('New release: {version}');
            expect(fetched?.config).toEqual({ notify_prereleases: false });
            expect(fetched?.last_seen).toEqual({});
            expect(fetched?.is_active).toBe(true);
        });

        it('returns null for a non-existent UUID', async () => {
            const result = await reader.getSubscriptionById('00000000-0000-0000-0000-000000000000');
            expect(result).toBeNull();
        });
    });

    describe('getSubscriptionsBySourceId', () => {
        beforeAll(async () => {
            // Clear and seed two subscriptions for the test source
            await pool.query('DELETE FROM github_subscriptions WHERE github_source_id = $1', [testSourceId]);
            await writer.createSubscription({
                github_source_id: testSourceId,
                event_type: 'new_release',
                connection_id: testConnectionId,
                message_template: 'Release: {version}',
                config: {},
            });
            await writer.createSubscription({
                github_source_id: testSourceId,
                event_type: 'new_commit',
                connection_id: testConnectionId,
                message_template: 'Commit: {sha}',
                config: {},
            });
        });

        it('returns all subscriptions for a source', async () => {
            const subs = await reader.getSubscriptionsBySourceId(testSourceId);
            expect(subs).toHaveLength(2);
            expect(subs.every(s => s instanceof Subscription)).toBe(true);
            expect(subs.every(s => s.github_source_id === testSourceId)).toBe(true);
            const eventTypes = subs.map(s => s.event_type).sort();
            expect(eventTypes).toEqual(['new_commit', 'new_release']);
        });

        it('returns empty array when source has no subscriptions', async () => {
            const subs = await reader.getSubscriptionsBySourceId('00000000-0000-0000-0000-000000000000');
            expect(subs).toEqual([]);
        });
    });

    describe('updateLastSeen', () => {
        let subId: string;

        beforeAll(async () => {
            await pool.query('DELETE FROM github_subscriptions WHERE github_source_id = $1', [testSourceId]);
            const sub = await writer.createSubscription({
                github_source_id: testSourceId,
                event_type: 'new_tag',
                connection_id: testConnectionId,
                message_template: 'New tag: {tag}',
                config: {},
            });
            subId = sub.id;
        });

        it('updates last_seen and the new value is readable via getSubscriptionById', async () => {
            const newLastSeen = { sha: 'abc123', timestamp: '2024-01-01T00:00:00Z' };
            await writer.updateLastSeen(subId, newLastSeen);

            const fetched = await reader.getSubscriptionById(subId);
            expect(fetched?.last_seen).toEqual(newLastSeen);
        });
    });

    describe('deleteSubscription', () => {
        it('subscription is no longer findable after delete', async () => {
            const sub = await writer.createSubscription({
                github_source_id: testSourceId,
                event_type: 'pr_opened',
                connection_id: testConnectionId,
                message_template: 'New PR: {title}',
                config: {},
            });

            await writer.deleteSubscription(sub.id);

            const fetched = await reader.getSubscriptionById(sub.id);
            expect(fetched).toBeNull();
        });
    });

    describe('getActiveSubscriptions', () => {
        let activeSubId: string;
        let inactiveSubId: string;
        let deletedConnSubId: string;
        let secondConnectionId: string;

        beforeAll(async () => {
            await pool.query('DELETE FROM github_subscriptions WHERE github_source_id = $1', [testSourceId]);

            // Create an active subscription with non-deleted connection
            const activeSub = await writer.createSubscription({
                github_source_id: testSourceId,
                event_type: 'new_release',
                connection_id: testConnectionId,
                message_template: 'Active release: {version}',
                config: { key: 'value' },
            });
            activeSubId = activeSub.id;

            // Create a subscription then set is_active = false
            const inactiveSub = await writer.createSubscription({
                github_source_id: testSourceId,
                event_type: 'new_commit',
                connection_id: testConnectionId,
                message_template: 'Inactive commit: {sha}',
                config: {},
            });
            inactiveSubId = inactiveSub.id;
            await pool.query('UPDATE github_subscriptions SET is_active = false WHERE id = $1', [inactiveSubId]);

            // Create a second connection, soft-delete it, and create a subscription using it
            const encryptedCreds2 = encryption.encrypt(JSON.stringify({ provider: 'email', address: 'deleted@test.com' }));
            const conn2Result = await pool.query(
                `INSERT INTO connections (user_id, provider, name, credentials)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [testUserId, 'email', 'Deleted Connection', { e: encryptedCreds2 }],
            );
            secondConnectionId = conn2Result.rows[0].id;
            await pool.query('UPDATE connections SET is_deleted = true WHERE id = $1', [secondConnectionId]);

            const deletedConnSub = await writer.createSubscription({
                github_source_id: testSourceId,
                event_type: 'star_milestone',
                connection_id: secondConnectionId,
                message_template: 'Star: {count}',
                config: {},
            });
            deletedConnSubId = deletedConnSub.id;
        });

        afterAll(async () => {
            await pool.query('DELETE FROM connections WHERE id = $1', [secondConnectionId]);
        });

        it('returns subscriptions with source data joined (repo_owner, repo_name, access_token)', async () => {
            const active = await reader.getActiveSubscriptions();
            const found = active.find(s => s.subscription_id === activeSubId);

            expect(found).toBeDefined();
            expect(found?.repo_owner).toBe('test-owner');
            expect(found?.repo_name).toBe('test-repo');
            expect(found?.access_token).toBe('ghp_test_access_token_123');
            expect(found?.event_type).toBe('new_release');
            expect(found?.message_template).toBe('Active release: {version}');
            expect(found?.config).toEqual({ key: 'value' });
            expect(found?.github_source_id).toBe(testSourceId);
            expect(found?.connection_id).toBe(testConnectionId);
        });

        it('excludes subscriptions where is_active = false', async () => {
            const active = await reader.getActiveSubscriptions();
            const ids = active.map(s => s.subscription_id);
            expect(ids).not.toContain(inactiveSubId);
        });

        it('excludes subscriptions where connection is_deleted = true', async () => {
            const active = await reader.getActiveSubscriptions();
            const ids = active.map(s => s.subscription_id);
            expect(ids).not.toContain(deletedConnSubId);
        });
    });
});
