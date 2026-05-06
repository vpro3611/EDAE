import { ReportConfigDeleteUseCase } from '../../../../src/modules/report/usecases/report_config.delete.usecase';
import { ReportConfigRepoReaderInterface, ReportConfigRepoWriterInterface } from '../../../../src/modules/report/interfaces/interface.repository';
import { ReportConfig } from '../../../../src/modules/report/entity/report_config';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('ReportConfigDeleteUseCase', () => {
    let reader: jest.Mocked<ReportConfigRepoReaderInterface>;
    let writer: jest.Mocked<ReportConfigRepoWriterInterface>;
    let useCase: ReportConfigDeleteUseCase;

    beforeEach(() => {
        reader = { getConfigById: jest.fn(), getActiveConfigsByUserId: jest.fn(), getAllActiveConfigs: jest.fn() };
        writer = { createConfig: jest.fn(), deleteConfig: jest.fn(), updateLastSentAt: jest.fn() };
        useCase = ReportConfigDeleteUseCase.create(reader, writer);
    });

    it('deletes when actor owns config', async () => {
        reader.getConfigById.mockResolvedValue(
            ReportConfig.restore('cfg','user','conn','weekly',3,true,null,new Date(),new Date()),
        );
        await useCase.execute('user','cfg');
        expect(writer.deleteConfig).toHaveBeenCalledWith('cfg');
    });

    it('throws 404 when not found', async () => {
        reader.getConfigById.mockResolvedValue(null);
        await expect(useCase.execute('user','cfg')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 when actor does not own config', async () => {
        reader.getConfigById.mockResolvedValue(
            ReportConfig.restore('cfg','owner','conn','weekly',3,true,null,new Date(),new Date()),
        );
        await expect(useCase.execute('other','cfg')).rejects.toMatchObject({ statusCode: 403 });
    });
});
