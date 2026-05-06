import { ReportFrequency } from '../entity/report_config';

export type ReportConfigDto = {
    id: string;
    user_id: string;
    connection_id: string;
    frequency: ReportFrequency;
    schedule_day: number;
    is_active: boolean;
    last_sent_at: string | null;
    created_at: string;
    updated_at: string;
};
