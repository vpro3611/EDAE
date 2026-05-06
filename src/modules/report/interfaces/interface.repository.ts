import { ReportConfig, ReportFrequency } from '../entity/report_config';

export interface ReportConfigRepoReaderInterface {
    getConfigById(id: string): Promise<ReportConfig | null>;
    getActiveConfigsByUserId(userId: string): Promise<ReportConfig[]>;
    getAllActiveConfigs(): Promise<ReportConfig[]>;
}

export interface ReportConfigRepoWriterInterface {
    createConfig(data: {
        user_id: string;
        connection_id: string;
        frequency: ReportFrequency;
        schedule_day: number;
    }): Promise<ReportConfig>;
    deleteConfig(id: string): Promise<void>;
    updateLastSentAt(id: string, sentAt: Date): Promise<void>;
}
