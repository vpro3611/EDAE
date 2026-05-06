import { Pool, PoolClient } from 'pg';
import { ReportConfig } from '../entity/report_config';
import { ReportConfigRepoReaderInterface } from '../interfaces/interface.repository';
import { handleDatabaseError } from '../../errors/mapper.database';

export class RepositoryReportConfigReader implements ReportConfigRepoReaderInterface {
    private moduleName = 'RepositoryReportConfigReader';

    constructor(private readonly db: Pool | PoolClient) {}

    static create(db: Pool | PoolClient): RepositoryReportConfigReader {
        return new RepositoryReportConfigReader(db);
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

    async getConfigById(id: string): Promise<ReportConfig | null> {
        try {
            const result = await this.db.query(
                'SELECT * FROM report_configurations WHERE id = $1',
                [id],
            );
            const row = result.rows[0];
            if (!row) return null;
            return this.restoreHelper(row);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getConfigById: ${id}`);
        }
    }

    async getActiveConfigsByUserId(userId: string): Promise<ReportConfig[]> {
        try {
            const result = await this.db.query(
                'SELECT * FROM report_configurations WHERE user_id = $1 AND is_active = true',
                [userId],
            );
            return result.rows.map(row => this.restoreHelper(row));
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getActiveConfigsByUserId: ${userId}`);
        }
    }

    async getAllActiveConfigs(): Promise<ReportConfig[]> {
        try {
            const result = await this.db.query(
                'SELECT * FROM report_configurations WHERE is_active = true',
            );
            return result.rows.map(row => this.restoreHelper(row));
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getAllActiveConfigs`);
        }
    }
}
