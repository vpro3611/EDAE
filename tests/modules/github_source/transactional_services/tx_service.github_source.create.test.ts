import { TxServiceGithubSourceCreate } from '../../../../src/modules/github_source/transactional_services/tx_service.github_source.create';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { GithubSourceDtoMapper } from '../../../../src/modules/github_source/dto/github_source.dto.mapper';
import { RepositoryGithubSourceWriter } from '../../../../src/modules/github_source/repository/repository.github_source.writer';
import { GithubSourceCreateUseCase } from '../../../../src/modules/github_source/usecases/github_source.create.usecase';

jest.mock('../../../../src/modules/github_source/repository/repository.github_source.writer');
jest.mock('../../../../src/modules/github_source/usecases/github_source.create.usecase');

describe('TxServiceGithubSourceCreate', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceGithubSourceCreate;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceGithubSourceCreate.create(txManager, mockEncryption, GithubSourceDtoMapper.create());
    });

    it('runs create inside a transaction and returns DTO', async () => {
        const mockDto = {
            id: 'src-1',
            user_id: 'user-1',
            repo_owner: 'octocat',
            repo_name: 'hello-world',
            has_token: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        const executeMock = jest.fn().mockResolvedValue(mockDto);
        (GithubSourceCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.createSourceService('user-1', 'octocat', 'hello-world', null);

        expect(result).toBe(mockDto);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('user-1', 'octocat', 'hello-world', null);
    });

    it('passes access token when provided', async () => {
        const mockDto = {
            id: 'src-2',
            user_id: 'user-1',
            repo_owner: 'octocat',
            repo_name: 'repo',
            has_token: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        const executeMock = jest.fn().mockResolvedValue(mockDto);
        (GithubSourceCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.createSourceService('user-1', 'octocat', 'repo', 'ghp_token');

        expect(result).toBe(mockDto);
        expect(executeMock).toHaveBeenCalledWith('user-1', 'octocat', 'repo', 'ghp_token');
    });

    it('propagates errors thrown by the use case', async () => {
        const error = new Error('Conflict: source already exists');
        const executeMock = jest.fn().mockRejectedValue(error);
        (GithubSourceCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await expect(service.createSourceService('user-1', 'owner', 'repo', null)).rejects.toThrow(
            'Conflict: source already exists',
        );
        expect(txManager.runInTransaction).toHaveBeenCalled();
    });

    it('creates writer and usecase inside the transaction callback', async () => {
        const executeMock = jest.fn().mockResolvedValue({} as any);
        (GithubSourceCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await service.createSourceService('user-1', 'owner', 'repo', null);

        expect(RepositoryGithubSourceWriter.create).toHaveBeenCalled();
        expect(GithubSourceCreateUseCase.create).toHaveBeenCalled();
    });
});
