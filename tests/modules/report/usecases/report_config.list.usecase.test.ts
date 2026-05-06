import { ReportConfigListUseCase } from '../../../../src/modules/report/usecases/report_config.list.usecase';
import { ReportConfigRepoReaderInterface } from '../../../../src/modules/report/interfaces/interface.repository';
import { ReportConfigDtoMapper } from '../../../../src/modules/report/dto/report_config.dto.mapper';
import { ReportConfig } from '../../../../src/modules/report/entity/report_config';

describe('ReportConfigListUseCase', () => {
    let reader: jest.Mocked<ReportConfigRepoReaderInterface>;
    let useCase: ReportConfigListUseCase;

    beforeEach(() => {
        reader = { getConfigById: jest.fn(), getActiveConfigsByUserId: jest.fn(), getAllActiveConfigs: jest.fn() };
        useCase = ReportConfigListUseCase.create(reader, ReportConfigDtoMapper.create());
    });

    it('returns mapped DTOs', async () => {
        reader.getActiveConfigsByUserId.mockResolvedValue([
            ReportConfig.restore('id','uid','cid','weekly',3,true,null,new Date(),new Date()),
        ]);
        const dtos = await useCase.execute('uid');
        expect(dtos).toHaveLength(1);
        expect(dtos[0].id).toBe('id');
    });

    it('returns empty array when none exist', async () => {
        reader.getActiveConfigsByUserId.mockResolvedValue([]);
        expect(await useCase.execute('uid')).toEqual([]);
    });
});
