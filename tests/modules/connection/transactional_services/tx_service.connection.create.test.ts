import { TxServiceConnectionCreate } from '../../../../src/modules/connection/transactional_services/tx_service.connection.create';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { RepositoryConnectionWriter } from '../../../../src/modules/connection/repository/repository.connection.writer';
import { ConnectionCreateUseCase } from '../../../../src/modules/connection/usecases/connection.create.usecase';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

jest.mock('../../../../src/modules/connection/repository/repository.connection.writer');
jest.mock('../../../../src/modules/connection/usecases/connection.create.usecase');

describe('TxServiceConnectionCreate', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionCreate;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionCreate.create(txManager, mockEncryption, ConnectionDtoMapper.create());
    });

    it('runs create inside a transaction and returns DTO', async () => {
        const mockDto = { id: 'conn-1' } as any;
        const executeMock = jest.fn().mockResolvedValue(mockDto);
        (ConnectionCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.createConnectionService('user-1', 'My Bot', CREDS);

        expect(result).toBe(mockDto);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('user-1', 'My Bot', CREDS);
    });
});
