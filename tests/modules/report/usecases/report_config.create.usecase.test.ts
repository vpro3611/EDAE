import { ReportConfigCreateUseCase } from '../../../../src/modules/report/usecases/report_config.create.usecase';
import { ReportConfigRepoWriterInterface } from '../../../../src/modules/report/interfaces/interface.repository';
import { ConnectionRepoReaderInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ReportConfigDtoMapper } from '../../../../src/modules/report/dto/report_config.dto.mapper';
import { ReportConfig } from '../../../../src/modules/report/entity/report_config';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';

function makeConfig() {
    return ReportConfig.restore('cfg-id','user-id','conn-id','weekly',3,true,null,new Date(),new Date());
}
function makeConn(userId = 'user-id', isDeleted = false) {
    return Connection.restore('conn-id',userId,'email','E',{provider:'email',address:'a@b.com'},new Date(),new Date(),isDeleted);
}

describe('ReportConfigCreateUseCase', () => {
    let writer: jest.Mocked<ReportConfigRepoWriterInterface>;
    let connReader: jest.Mocked<ConnectionRepoReaderInterface>;
    let useCase: ReportConfigCreateUseCase;

    beforeEach(() => {
        writer = { createConfig: jest.fn(), deleteConfig: jest.fn(), updateLastSentAt: jest.fn() };
        connReader = { getConnectionById: jest.fn(), getActiveConnectionsByUserId: jest.fn(), getDeletedConnectionsByUserId: jest.fn() };
        useCase = ReportConfigCreateUseCase.create(writer, connReader, ReportConfigDtoMapper.create());
    });

    it('creates and returns DTO', async () => {
        connReader.getConnectionById.mockResolvedValue(makeConn());
        writer.createConfig.mockResolvedValue(makeConfig());
        const dto = await useCase.execute('user-id','conn-id','weekly',3);
        expect(dto.id).toBe('cfg-id');
        expect(writer.createConfig).toHaveBeenCalledWith({ user_id:'user-id', connection_id:'conn-id', frequency:'weekly', schedule_day:3 });
    });

    it('throws 404 when connection not found', async () => {
        connReader.getConnectionById.mockResolvedValue(null);
        await expect(useCase.execute('user-id','conn-id','daily',0)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 when connection owned by different user', async () => {
        connReader.getConnectionById.mockResolvedValue(makeConn('other'));
        await expect(useCase.execute('user-id','conn-id','daily',0)).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 400 when connection is deleted', async () => {
        connReader.getConnectionById.mockResolvedValue(makeConn('user-id', true));
        await expect(useCase.execute('user-id','conn-id','daily',0)).rejects.toMatchObject({ statusCode: 400 });
    });
});
