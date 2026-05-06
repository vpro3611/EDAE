import { ReportConfig } from '../entity/report_config';
import { ReportConfigDto } from './report_config.dto';

export class ReportConfigDtoMapper {
    static create(): ReportConfigDtoMapper {
        return new ReportConfigDtoMapper();
    }

    mapToDto(config: ReportConfig): ReportConfigDto {
        return {
            id: config.id,
            user_id: config.user_id,
            connection_id: config.connection_id,
            frequency: config.frequency,
            schedule_day: config.schedule_day,
            is_active: config.is_active,
            last_sent_at: config.last_sent_at ? config.last_sent_at.toISOString() : null,
            created_at: config.created_at.toISOString(),
            updated_at: config.updated_at.toISOString(),
        };
    }
}
