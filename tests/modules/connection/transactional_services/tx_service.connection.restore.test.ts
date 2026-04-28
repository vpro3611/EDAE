import { TxServiceConnectionRestore } from '../../../../src/modules/connection/transactional_services/tx_service.connection.restore';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../../../../src/modules/connection/repository/repository.connection.writer';
import { ConnectionRestoreUseCase } from '../../../../src/modules/connection/usecases/connection.restore.usecase';

jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/connection/repository/repository.connection.writer');
jest.mock('../../../../src/modules/connection/usecases/connection.restore.usecase');

describe('TxServiceConnectionRestore', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionRestore;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionRestore.create(txManager, mockEncryption, ConnectionDtoMapper.create());
    });

    it('runs restore inside a transaction and returns DTO', async () => {
        const mockDto = { id: 'conn-1', is_deleted: false } as any;
        const executeMock = jest.fn().mockResolvedValue(mockDto);
        (ConnectionRestoreUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.restoreConnectionService('actor-1', 'conn-1');

        expect(result).toBe(mockDto);
        expect(executeMock).toHaveBeenCalledWith('actor-1', 'conn-1');
    });
});
