import { TxServiceSubscriptionCreate } from '../../../../src/modules/subscription/transactional_services/tx_service.subscription.create';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { SubscriptionDtoMapper } from '../../../../src/modules/subscription/dto/subscription.dto.mapper';
import { RepositoryGithubSourceReader } from '../../../../src/modules/github_source/repository/repository.github_source.reader';
import { RepositorySubscriptionWriter } from '../../../../src/modules/subscription/repository/repository.subscription.writer';
import { SubscriptionCreateUseCase } from '../../../../src/modules/subscription/usecases/subscription.create.usecase';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { SubscriptionEventType } from '../../../../src/modules/subscription/subscription.event_types';

jest.mock('@octokit/rest', () => ({ Octokit: jest.fn() }));
jest.mock('../../../../src/modules/github_source/repository/repository.github_source.reader');
jest.mock('../../../../src/modules/subscription/repository/repository.subscription.writer');
jest.mock('../../../../src/modules/subscription/usecases/subscription.create.usecase');

describe('TxServiceSubscriptionCreate', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceSubscriptionCreate;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    const NOW = new Date().toISOString();
    const MOCK_DTO = {
        id: 'sub-1',
        github_source_id: 'src-1',
        event_type: 'new_release' as SubscriptionEventType,
        connection_id: 'conn-1',
        message_template: 'New release!',
        config: {},
        is_active: true,
        created_at: NOW,
        updated_at: NOW,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceSubscriptionCreate.create(txManager, mockEncryption, SubscriptionDtoMapper.create());
    });

    it('runs create inside a transaction and returns DTO', async () => {
        const executeMock = jest.fn().mockResolvedValue(MOCK_DTO);
        (SubscriptionCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.createSubscriptionService(
            'actor-1', 'src-1', 'new_release', 'conn-1', 'New release!', {},
        );

        expect(result).toBe(MOCK_DTO);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('actor-1', 'src-1', 'new_release', 'conn-1', 'New release!', {});
    });

    it('calls execute with all 6 arguments in correct order', async () => {
        const executeMock = jest.fn().mockResolvedValue(MOCK_DTO);
        (SubscriptionCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await service.createSubscriptionService(
            'actor-uuid', 'source-uuid', 'pr_merged', 'conn-uuid', 'PR merged!', { threshold: 10 },
        );

        expect(executeMock).toHaveBeenCalledWith('actor-uuid', 'source-uuid', 'pr_merged', 'conn-uuid', 'PR merged!', { threshold: 10 });
    });

    it('creates source reader, subscription writer and use case inside the transaction callback', async () => {
        const executeMock = jest.fn().mockResolvedValue(MOCK_DTO);
        (SubscriptionCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await service.createSubscriptionService('actor-1', 'src-1', 'new_release', 'conn-1', 'msg', {});

        expect(RepositoryGithubSourceReader.create).toHaveBeenCalled();
        expect(RepositorySubscriptionWriter.create).toHaveBeenCalled();
        expect(SubscriptionCreateUseCase.create).toHaveBeenCalled();
    });

    it('propagates errors thrown by the use case', async () => {
        const error = new AppError('Source not found.', 404, 'SubscriptionCreateUseCase');
        const executeMock = jest.fn().mockRejectedValue(error);
        (SubscriptionCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await expect(
            service.createSubscriptionService('actor-1', 'bad-src', 'new_release', 'conn-1', 'msg', {}),
        ).rejects.toThrow('Source not found.');
        expect(txManager.runInTransaction).toHaveBeenCalled();
    });

    it('propagates 403 AppError when actor is forbidden', async () => {
        const error = new AppError('Forbidden.', 403, 'SubscriptionCreateUseCase');
        const executeMock = jest.fn().mockRejectedValue(error);
        (SubscriptionCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await expect(
            service.createSubscriptionService('other-actor', 'src-1', 'new_release', 'conn-1', 'msg', {}),
        ).rejects.toThrow('Forbidden.');
    });
});
