import { TxServiceSubscriptionDelete } from '../../../../src/modules/subscription/transactional_services/tx_service.subscription.delete';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { RepositoryGithubSourceReader } from '../../../../src/modules/github_source/repository/repository.github_source.reader';
import { RepositorySubscriptionReader } from '../../../../src/modules/subscription/repository/repository.subscription.reader';
import { RepositorySubscriptionWriter } from '../../../../src/modules/subscription/repository/repository.subscription.writer';
import { SubscriptionDeleteUseCase } from '../../../../src/modules/subscription/usecases/subscription.delete.usecase';
import { AppError } from '../../../../src/modules/errors/errors.global';

jest.mock('../../../../src/modules/github_source/repository/repository.github_source.reader');
jest.mock('../../../../src/modules/subscription/repository/repository.subscription.reader');
jest.mock('../../../../src/modules/subscription/repository/repository.subscription.writer');
jest.mock('../../../../src/modules/subscription/usecases/subscription.delete.usecase');

describe('TxServiceSubscriptionDelete', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceSubscriptionDelete;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceSubscriptionDelete.create(txManager, mockEncryption);
    });

    it('runs delete inside a transaction and returns void', async () => {
        const executeMock = jest.fn().mockResolvedValue(undefined);
        (SubscriptionDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.deleteSubscriptionService('actor-1', 'sub-1');

        expect(result).toBeUndefined();
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('actor-1', 'sub-1');
    });

    it('calls execute with actorId and subscriptionId', async () => {
        const executeMock = jest.fn().mockResolvedValue(undefined);
        (SubscriptionDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await service.deleteSubscriptionService('actor-uuid', 'sub-uuid');

        expect(executeMock).toHaveBeenCalledWith('actor-uuid', 'sub-uuid');
    });

    it('creates source reader, subscription reader, subscription writer and use case inside the transaction callback', async () => {
        const executeMock = jest.fn().mockResolvedValue(undefined);
        (SubscriptionDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await service.deleteSubscriptionService('actor-1', 'sub-1');

        expect(RepositoryGithubSourceReader.create).toHaveBeenCalled();
        expect(RepositorySubscriptionReader.create).toHaveBeenCalled();
        expect(RepositorySubscriptionWriter.create).toHaveBeenCalled();
        expect(SubscriptionDeleteUseCase.create).toHaveBeenCalled();
    });

    it('propagates 403 AppError when actor does not own the subscription', async () => {
        const error = new AppError('Forbidden.', 403, 'SubscriptionDeleteUseCase');
        const executeMock = jest.fn().mockRejectedValue(error);
        (SubscriptionDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await expect(service.deleteSubscriptionService('other-actor', 'sub-1')).rejects.toThrow('Forbidden.');
        expect(txManager.runInTransaction).toHaveBeenCalled();
    });

    it('propagates 404 AppError when subscription does not exist', async () => {
        const error = new AppError('Subscription not found.', 404, 'SubscriptionDeleteUseCase');
        const executeMock = jest.fn().mockRejectedValue(error);
        (SubscriptionDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await expect(service.deleteSubscriptionService('actor-1', 'nonexistent-sub')).rejects.toThrow('Subscription not found.');
    });

    it('propagates generic errors thrown by the use case', async () => {
        const error = new Error('Database connection lost');
        const executeMock = jest.fn().mockRejectedValue(error);
        (SubscriptionDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await expect(service.deleteSubscriptionService('actor-1', 'sub-1')).rejects.toThrow('Database connection lost');
    });
});
