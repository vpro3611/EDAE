import { ReportConfig } from '../../../../src/modules/report/entity/report_config';
import { ReportConfigDtoMapper } from '../../../../src/modules/report/dto/report_config.dto.mapper';

describe('ReportConfigDtoMapper', () => {
    const mapper = ReportConfigDtoMapper.create();
    const NOW = new Date('2026-05-06T10:00:00Z');

    it('maps a config with last_sent_at to full DTO shape', () => {
        const sent = new Date('2026-04-29T10:00:00Z');
        const config = ReportConfig.restore('id', 'uid', 'cid', 'weekly', 3, true, sent, NOW, NOW);
        const dto = mapper.mapToDto(config);
        expect(dto).toEqual({
            id: 'id',
            user_id: 'uid',
            connection_id: 'cid',
            frequency: 'weekly',
            schedule_day: 3,
            is_active: true,
            last_sent_at: sent.toISOString(),
            created_at: NOW.toISOString(),
            updated_at: NOW.toISOString(),
        });
    });

    it('maps null last_sent_at correctly', () => {
        const config = ReportConfig.restore('id', 'uid', 'cid', 'daily', 0, true, null, NOW, NOW);
        expect(mapper.mapToDto(config).last_sent_at).toBeNull();
    });
});
