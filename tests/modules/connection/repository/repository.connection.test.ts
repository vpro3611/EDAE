import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../../../../src/modules/connection/repository/repository.connection.writer';
import { InfraCryptoAesImplementation } from '../../../../src/modules/infra/encryption/infra.encryption_aes.implementation';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

dotenv.config();

const TELEGRAM_CREDS: ConnectionCredentials = {
    provider: 'telegram',
    bot_token: 'bot-test-token',
    chat_id: 'chat-test-id',
};

describe('RepositoryConnection Integration Tests', () => {
    let pool: Pool;
    let reader: RepositoryConnectionReader;
    let writer: RepositoryConnectionWriter;
    let testUserId: string;

    beforeAll(async () => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const encryption = InfraCryptoAesImplementation.create(process.env.ENCRYPTION_KEY!);
        reader = RepositoryConnectionReader.create(pool, encryption);
        writer = RepositoryConnectionWriter.create(pool, encryption);

        const userResult = await pool.query(
            `INSERT INTO users (name, email, password_hashed, last_password, is_verified)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            ['Test User', 'conn-repo-test@example.com', 'HashedPwd1!', 'HashedPwd1!', true],
        );
        testUserId = userResult.rows[0].id;

        await pool.query('DELETE FROM connections WHERE user_id = $1', [testUserId]);
    });

    afterAll(async () => {
        await pool.query('DELETE FROM connections WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await pool.end();
    });

    describe('createConnection + getConnectionById', () => {
        it('creates a connection and reads it back with decrypted credentials', async () => {
            const created = await writer.createConnection({
                user_id: testUserId,
                provider: 'telegram',
                name: 'My Bot',
                credentials: TELEGRAM_CREDS,
            });

            expect(created).toBeInstanceOf(Connection);
            expect(created.user_id).toBe(testUserId);
            expect(created.provider).toBe('telegram');
            expect(created.credentials).toEqual(TELEGRAM_CREDS);

            const fetched = await reader.getConnectionById(created.id);
            expect(fetched).toBeInstanceOf(Connection);
            expect(fetched?.credentials).toEqual(TELEGRAM_CREDS);
        });

        it('returns null for a non-existent id', async () => {
            const result = await reader.getConnectionById('00000000-0000-0000-0000-000000000000');
            expect(result).toBeNull();
        });
    });

    describe('getActiveConnectionsByUserId', () => {
        it('returns only active connections', async () => {
            await pool.query('DELETE FROM connections WHERE user_id = $1', [testUserId]);

            await writer.createConnection({ user_id: testUserId, provider: 'telegram', name: 'A', credentials: TELEGRAM_CREDS });
            const deleted = await writer.createConnection({ user_id: testUserId, provider: 'telegram', name: 'B', credentials: TELEGRAM_CREDS });
            await writer.softDeleteConnection(deleted.id);

            const active = await reader.getActiveConnectionsByUserId(testUserId);
            expect(active).toHaveLength(1);
            expect(active[0].name).toBe('A');
        });
    });

    describe('getDeletedConnectionsByUserId', () => {
        it('returns only deleted connections', async () => {
            const deleted = await reader.getDeletedConnectionsByUserId(testUserId);
            expect(deleted).toHaveLength(1);
            expect(deleted[0].name).toBe('B');
            expect(deleted[0].is_deleted).toBe(true);
        });
    });

    describe('updateConnection', () => {
        it('updates name and credentials, persists encryption', async () => {
            await pool.query('DELETE FROM connections WHERE user_id = $1', [testUserId]);
            const conn = await writer.createConnection({
                user_id: testUserId, provider: 'telegram', name: 'Old', credentials: TELEGRAM_CREDS,
            });

            conn.updateName('New Name');
            conn.updateCredentials({ provider: 'telegram', bot_token: 'new-tok', chat_id: 'new-chat' });
            await writer.updateConnection(conn);

            const fetched = await reader.getConnectionById(conn.id);
            expect(fetched?.name).toBe('New Name');
            expect(fetched?.credentials).toEqual({ provider: 'telegram', bot_token: 'new-tok', chat_id: 'new-chat' });
        });
    });

    describe('restoreConnection', () => {
        it('sets is_deleted back to false', async () => {
            await pool.query('DELETE FROM connections WHERE user_id = $1', [testUserId]);
            const conn = await writer.createConnection({
                user_id: testUserId, provider: 'telegram', name: 'C', credentials: TELEGRAM_CREDS,
            });
            await writer.softDeleteConnection(conn.id);
            await writer.restoreConnection(conn.id);

            const fetched = await reader.getConnectionById(conn.id);
            expect(fetched?.is_deleted).toBe(false);
        });
    });
});
