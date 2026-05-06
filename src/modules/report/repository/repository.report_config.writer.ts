import { Pool, PoolClient } from 'pg';
import { ReportConfig, ReportFrequency } from '../entity/report_config';
import { ReportConfigRepoWriterInterface } from '../interfaces/interface.repository';
import { handleDatabaseError } from '../../errors/mapper.database';

export class RepositoryReportConfigWriter implements ReportConfigRepoWriterInterface {
    private moduleName = 'RepositoryReportConfigWriter';

    constructor(private readonly db: Pool | PoolClient) {}

    static create(db: Pool | PoolClient): RepositoryReportConfigWriter {
        return new RepositoryReportConfigWriter(db);
    }

    private restoreHelper(row: any): ReportConfig {
        return ReportConfig.restore(
            row.id,
            row.user_id,
            row.connection_id,
            row.frequency,
            row.schedule_day,
            row.is_active,
            row.last_sent_at,
            row.created_at,
            row.updated_at,
        );
    }

    async createConfig(data: {
        user_id: string;
        connection_id: string;
        frequency: ReportFrequency;
        schedule_day: number;
    }): Promise<ReportConfig> {
        try {
            const result = await this.db.query(
                `INSERT INTO report_configurations (user_id, connection_id, frequency, schedule_day)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [data.user_id, data.connection_id, data.frequency, data.schedule_day],
            );
            return this.restoreHelper(result.rows[0]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.createConfig`);
        }
    }

    async deleteConfig(id: string): Promise<void> {
        try {
            await this.db.query(
                'DELETE FROM report_configurations WHERE id = $1',
                [id],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.deleteConfig: ${id}`);
        }
    }

    async updateLastSentAt(id: string, sentAt: Date): Promise<void> {
        try {
            await this.db.query(
                'UPDATE report_configurations SET last_sent_at = $1, updated_at = now() WHERE id = $2',
                [sentAt, id],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.updateLastSentAt: ${id}`);
        }
    }
}
