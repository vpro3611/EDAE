import { TxServiceGithubSourceList } from '../../../../src/modules/github_source/transactional_services/tx_service.github_source.list';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { GithubSourceDtoMapper } from '../../../../src/modules/github_source/dto/github_source.dto.mapper';
import { RepositoryGithubSourceReader } from '../../../../src/modules/github_source/repository/repository.github_source.reader';
import { GithubSourceListUseCase } from '../../../../src/modules/github_source/usecases/github_source.list.usecase';

jest.mock('../../../../src/modules/github_source/repository/repository.github_source.reader');
jest.mock('../../../../src/modules/github_source/usecases/github_source.list.usecase');

describe('TxServiceGithubSourceList', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceGithubSourceList;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    const NOW = new Date().toISOString();
    const MOCK_DTO_LIST = [
        {
            id: 'src-1',
            user_id: 'user-1',
            repo_owner: 'octocat',
            repo_name: 'hello-world',
            has_token: false,
            created_at: NOW,
            updated_at: NOW,
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceGithubSourceList.create(txManager, mockEncryption, GithubSourceDtoMapper.create());
    });

    it('runs list inside a transaction and returns DTO array', async () => {
        const executeMock = jest.fn().mockResolvedValue(MOCK_DTO_LIST);
        (GithubSourceListUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.listSourcesService('user-1');

        expect(result).toBe(MOCK_DTO_LIST);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('user-1');
    });

    it('returns empty array when user has no sources', async () => {
        const executeMock = jest.fn().mockResolvedValue([]);
        (GithubSourceListUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.listSourcesService('user-no-sources');

        expect(result).toEqual([]);
        expect(executeMock).toHaveBeenCalledWith('user-no-sources');
    });

    it('propagates errors thrown by the use case', async () => {
        const error = new Error('Database error');
        const executeMock = jest.fn().mockRejectedValue(error);
        (GithubSourceListUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await expect(service.listSourcesService('user-1')).rejects.toThrow('Database error');
        expect(txManager.runInTransaction).toHaveBeenCalled();
    });

    it('creates reader and usecase inside the transaction callback', async () => {
        const executeMock = jest.fn().mockResolvedValue([]);
        (GithubSourceListUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await service.listSourcesService('user-1');

        expect(RepositoryGithubSourceReader.create).toHaveBeenCalled();
        expect(GithubSourceListUseCase.create).toHaveBeenCalled();
    });
});
