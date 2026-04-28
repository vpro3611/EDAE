import { TxServiceConnectionUpdate } from '../../../../src/modules/connection/transactional_services/tx_service.connection.update';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../../../../src/modules/connection/repository/repository.connection.writer';
import { ConnectionUpdateUseCase } from '../../../../src/modules/connection/usecases/connection.update.usecase';

jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/connection/repository/repository.connection.writer');
jest.mock('../../../../src/modules/connection/usecases/connection.update.usecase');

describe('TxServiceConnectionUpdate', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionUpdate;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionUpdate.create(txManager, mockEncryption, ConnectionDtoMapper.create());
    });

    it('runs update inside a transaction', async () => {
        const mockDto = { id: 'conn-1', name: 'New' } as any;
        const executeMock = jest.fn().mockResolvedValue(mockDto);
        (ConnectionUpdateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.updateConnectionService('actor-1', 'conn-1', { name: 'New' });

        expect(result).toBe(mockDto);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('actor-1', 'conn-1', { name: 'New' });
    });
});
