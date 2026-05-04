import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryGithubSourceWriter } from '../repository/repository.github_source.writer';
import { GithubSourceCreateUseCase } from '../usecases/github_source.create.usecase';
import { GithubSourceDtoMapper } from '../dto/github_source.dto.mapper';
import { GithubSourceDto } from '../dto/github_source.dto';

export class TxServiceGithubSourceCreate {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly mapper: GithubSourceDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, mapper: GithubSourceDtoMapper): TxServiceGithubSourceCreate {
        return new TxServiceGithubSourceCreate(txManager, encryption, mapper);
    }

    async createSourceService(userId: string, repoOwner: string, repoName: string, accessToken: string | null): Promise<GithubSourceDto> {
        return await this.txManager.runInTransaction(async (client) => {
            const writer = RepositoryGithubSourceWriter.create(client, this.encryption);
            const useCase = GithubSourceCreateUseCase.create(writer, this.mapper);
            return await useCase.execute(userId, repoOwner, repoName, accessToken);
        });
    }
}
