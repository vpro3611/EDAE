import { TxServiceConnectionSoftDelete } from '../../../../src/modules/connection/transactional_services/tx_service.connection.soft_delete';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../../../../src/modules/connection/repository/repository.connection.writer';
import { ConnectionSoftDeleteUseCase } from '../../../../src/modules/connection/usecases/connection.soft_delete.usecase';

jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/connection/repository/repository.connection.writer');
jest.mock('../../../../src/modules/connection/usecases/connection.soft_delete.usecase');

describe('TxServiceConnectionSoftDelete', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionSoftDelete;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionSoftDelete.create(txManager, mockEncryption);
    });

    it('runs soft-delete inside a transaction', async () => {
        const executeMock = jest.fn().mockResolvedValue(undefined);
        (ConnectionSoftDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await service.softDeleteConnectionService('actor-1', 'conn-1');

        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('actor-1', 'conn-1');
    });
});
