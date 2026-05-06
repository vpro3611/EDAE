import { TxServiceReportConfigCreate } from '../../../../src/modules/report/transactional_services/tx_service.report_config.create';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ReportConfigDtoMapper } from '../../../../src/modules/report/dto/report_config.dto.mapper';
import { RepositoryReportConfigWriter } from '../../../../src/modules/report/repository/repository.report_config.writer';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { ReportConfigCreateUseCase } from '../../../../src/modules/report/usecases/report_config.create.usecase';

jest.mock('../../../../src/modules/report/repository/repository.report_config.writer');
jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/report/usecases/report_config.create.usecase');

describe('TxServiceReportConfigCreate', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceReportConfigCreate;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        txManager = { runInTransaction: jest.fn().mockImplementation(async cb => cb({} as any)) };
        service = TxServiceReportConfigCreate.create(txManager, mockEncryption, ReportConfigDtoMapper.create());
    });

    it('runs inside a transaction and returns DTO', async () => {
        const mockDto = { id: 'cfg-id' } as any;
        const executeMock = jest.fn().mockResolvedValue(mockDto);
        (ReportConfigCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.createReportConfigService('user-id','conn-id','weekly',3);

        expect(result).toBe(mockDto);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('user-id','conn-id','weekly',3);
    });
});
