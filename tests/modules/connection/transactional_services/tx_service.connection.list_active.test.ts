import { TxServiceConnectionListActive } from '../../../../src/modules/connection/transactional_services/tx_service.connection.list_active';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { ConnectionListActiveUseCase } from '../../../../src/modules/connection/usecases/connection.list_active.usecase';

jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/connection/usecases/connection.list_active.usecase');

describe('TxServiceConnectionListActive', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionListActive;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionListActive.create(txManager, mockEncryption, ConnectionDtoMapper.create());
    });

    it('runs list inside a transaction and returns DTOs', async () => {
        const mockDtos = [{ id: 'a' }] as any;
        const executeMock = jest.fn().mockResolvedValue(mockDtos);
        (ConnectionListActiveUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.listActiveConnectionsService('user-1');

        expect(result).toBe(mockDtos);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('user-1');
    });
});
