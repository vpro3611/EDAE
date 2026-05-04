import { TxServiceGithubSourceDelete } from '../../../../src/modules/github_source/transactional_services/tx_service.github_source.delete';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { RepositoryGithubSourceReader } from '../../../../src/modules/github_source/repository/repository.github_source.reader';
import { RepositoryGithubSourceWriter } from '../../../../src/modules/github_source/repository/repository.github_source.writer';
import { GithubSourceDeleteUseCase } from '../../../../src/modules/github_source/usecases/github_source.delete.usecase';
import { AppError } from '../../../../src/modules/errors/errors.global';

jest.mock('../../../../src/modules/github_source/repository/repository.github_source.reader');
jest.mock('../../../../src/modules/github_source/repository/repository.github_source.writer');
jest.mock('../../../../src/modules/github_source/usecases/github_source.delete.usecase');

describe('TxServiceGithubSourceDelete', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceGithubSourceDelete;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceGithubSourceDelete.create(txManager, mockEncryption);
    });

    it('runs delete inside a transaction and returns void', async () => {
        const executeMock = jest.fn().mockResolvedValue(undefined);
        (GithubSourceDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.deleteSourceService('actor-uuid', 'source-uuid');

        expect(result).toBeUndefined();
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('actor-uuid', 'source-uuid');
    });

    it('propagates 403 AppError when actor does not own the source', async () => {
        const error = new AppError('Forbidden.', 403, 'TxServiceGithubSourceDelete');
        const executeMock = jest.fn().mockRejectedValue(error);
        (GithubSourceDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await expect(service.deleteSourceService('other-user', 'source-uuid')).rejects.toThrow('Forbidden.');
        expect(txManager.runInTransaction).toHaveBeenCalled();
    });

    it('propagates 404 AppError when source does not exist', async () => {
        const error = new AppError('Source not found.', 404, 'TxServiceGithubSourceDelete');
        const executeMock = jest.fn().mockRejectedValue(error);
        (GithubSourceDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await expect(service.deleteSourceService('actor-uuid', 'nonexistent-uuid')).rejects.toThrow(
            'Source not found.',
        );
    });

    it('creates reader, writer and usecase inside the transaction callback', async () => {
        const executeMock = jest.fn().mockResolvedValue(undefined);
        (GithubSourceDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await service.deleteSourceService('actor-uuid', 'source-uuid');

        expect(RepositoryGithubSourceReader.create).toHaveBeenCalled();
        expect(RepositoryGithubSourceWriter.create).toHaveBeenCalled();
        expect(GithubSourceDeleteUseCase.create).toHaveBeenCalled();
    });
});
