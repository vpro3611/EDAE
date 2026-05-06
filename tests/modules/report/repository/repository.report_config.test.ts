import { pool } from '../../../../src/database';
import { RepositoryReportConfigReader } from '../../../../src/modules/report/repository/repository.report_config.reader';
import { RepositoryReportConfigWriter } from '../../../../src/modules/report/repository/repository.report_config.writer';

describe('RepositoryReportConfig integration', () => {
    let USER_ID: string;
    let CONN_ID: string;
    let configId: string;

    beforeAll(async () => {
        const u = await pool.query(
            `INSERT INTO users (name,email,password_hashed,last_password)
             VALUES ('R','rrepo@test.com','h','h') RETURNING id`,
        );
        USER_ID = u.rows[0].id;
        const c = await pool.query(
            `INSERT INTO connections (user_id,provider,name,credentials)
             VALUES ($1,'email','E','{"e":"x"}') RETURNING id`,
            [USER_ID],
        );
        CONN_ID = c.rows[0].id;
    });

    afterAll(async () => {
        await pool.query('DELETE FROM report_configurations WHERE user_id=$1', [USER_ID]);
        await pool.query('DELETE FROM connections WHERE id=$1', [CONN_ID]);
        await pool.query('DELETE FROM users WHERE id=$1', [USER_ID]);
        await pool.end();
    });

    it('creates and reads a config', async () => {
        const writer = RepositoryReportConfigWriter.create(pool);
        const cfg = await writer.createConfig({ user_id: USER_ID, connection_id: CONN_ID, frequency: 'weekly', schedule_day: 3 });
        configId = cfg.id;
        expect(cfg.frequency).toBe('weekly');
        expect(cfg.is_active).toBe(true);
        expect(cfg.last_sent_at).toBeNull();
    });

    it('reads by id', async () => {
        const reader = RepositoryReportConfigReader.create(pool);
        const found = await reader.getConfigById(configId);
        expect(found?.id).toBe(configId);
    });

    it('reads active configs by userId', async () => {
        const reader = RepositoryReportConfigReader.create(pool);
        const list = await reader.getActiveConfigsByUserId(USER_ID);
        expect(list.some(c => c.id === configId)).toBe(true);
    });

    it('returns config in getAllActiveConfigs', async () => {
        const reader = RepositoryReportConfigReader.create(pool);
        const all = await reader.getAllActiveConfigs();
        expect(all.some(c => c.id === configId)).toBe(true);
    });

    it('updates last_sent_at', async () => {
        const sentAt = new Date();
        await RepositoryReportConfigWriter.create(pool).updateLastSentAt(configId, sentAt);
        const cfg = await RepositoryReportConfigReader.create(pool).getConfigById(configId);
        expect(cfg?.last_sent_at?.getTime()).toBeCloseTo(sentAt.getTime(), -3);
    });

    it('deletes a config', async () => {
        await RepositoryReportConfigWriter.create(pool).deleteConfig(configId);
        const cfg = await RepositoryReportConfigReader.create(pool).getConfigById(configId);
        expect(cfg).toBeNull();
    });
});
