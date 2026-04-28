import { TxServiceConnectionListDeleted } from '../../../../src/modules/connection/transactional_services/tx_service.connection.list_deleted';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { ConnectionListDeletedUseCase } from '../../../../src/modules/connection/usecases/connection.list_deleted.usecase';

jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/connection/usecases/connection.list_deleted.usecase');

describe('TxServiceConnectionListDeleted', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionListDeleted;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionListDeleted.create(txManager, mockEncryption, ConnectionDtoMapper.create());
    });

    it('runs list inside a transaction and returns DTOs', async () => {
        const mockDtos = [{ id: 'x', is_deleted: true }] as any;
        const executeMock = jest.fn().mockResolvedValue(mockDtos);
        (ConnectionListDeletedUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.listDeletedConnectionsService('user-1');

        expect(result).toBe(mockDtos);
        expect(executeMock).toHaveBeenCalledWith('user-1');
    });
});
