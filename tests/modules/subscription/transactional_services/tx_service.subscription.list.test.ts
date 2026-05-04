import { TxServiceSubscriptionList } from '../../../../src/modules/subscription/transactional_services/tx_service.subscription.list';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { SubscriptionDtoMapper } from '../../../../src/modules/subscription/dto/subscription.dto.mapper';
import { RepositoryGithubSourceReader } from '../../../../src/modules/github_source/repository/repository.github_source.reader';
import { RepositorySubscriptionReader } from '../../../../src/modules/subscription/repository/repository.subscription.reader';
import { SubscriptionListUseCase } from '../../../../src/modules/subscription/usecases/subscription.list.usecase';
import { AppError } from '../../../../src/modules/errors/errors.global';

jest.mock('../../../../src/modules/github_source/repository/repository.github_source.reader');
jest.mock('../../../../src/modules/subscription/repository/repository.subscription.reader');
jest.mock('../../../../src/modules/subscription/usecases/subscription.list.usecase');

describe('TxServiceSubscriptionList', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceSubscriptionList;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    const NOW = new Date().toISOString();
    const MOCK_DTO_LIST = [
        {
            id: 'sub-1',
            github_source_id: 'src-1',
            event_type: 'new_release',
            connection_id: 'conn-1',
            message_template: 'New release!',
            config: {},
            is_active: true,
            created_at: NOW,
            updated_at: NOW,
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceSubscriptionList.create(txManager, mockEncryption, SubscriptionDtoMapper.create());
    });

    it('runs list inside a transaction and returns DTO array', async () => {
        const executeMock = jest.fn().mockResolvedValue(MOCK_DTO_LIST);
        (SubscriptionListUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.listSubscriptionsService('actor-1', 'src-1');

        expect(result).toBe(MOCK_DTO_LIST);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('actor-1', 'src-1');
    });

    it('calls execute with actorId and sourceId', async () => {
        const executeMock = jest.fn().mockResolvedValue([]);
        (SubscriptionListUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await service.listSubscriptionsService('actor-uuid', 'source-uuid');

        expect(executeMock).toHaveBeenCalledWith('actor-uuid', 'source-uuid');
    });

    it('returns empty array when no subscriptions exist', async () => {
        const executeMock = jest.fn().mockResolvedValue([]);
        (SubscriptionListUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.listSubscriptionsService('actor-1', 'src-no-subs');

        expect(result).toEqual([]);
    });

    it('creates source reader, subscription reader and use case inside the transaction callback', async () => {
        const executeMock = jest.fn().mockResolvedValue([]);
        (SubscriptionListUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await service.listSubscriptionsService('actor-1', 'src-1');

        expect(RepositoryGithubSourceReader.create).toHaveBeenCalled();
        expect(RepositorySubscriptionReader.create).toHaveBeenCalled();
        expect(SubscriptionListUseCase.create).toHaveBeenCalled();
    });

    it('propagates errors thrown by the use case', async () => {
        const error = new Error('Database error');
        const executeMock = jest.fn().mockRejectedValue(error);
        (SubscriptionListUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await expect(service.listSubscriptionsService('actor-1', 'src-1')).rejects.toThrow('Database error');
        expect(txManager.runInTransaction).toHaveBeenCalled();
    });

    it('propagates 404 AppError when source does not exist', async () => {
        const error = new AppError('Source not found.', 404, 'SubscriptionListUseCase');
        const executeMock = jest.fn().mockRejectedValue(error);
        (SubscriptionListUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await expect(service.listSubscriptionsService('actor-1', 'nonexistent-src')).rejects.toThrow('Source not found.');
    });
});
