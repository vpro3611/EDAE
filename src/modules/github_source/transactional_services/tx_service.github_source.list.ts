import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryGithubSourceReader } from '../repository/repository.github_source.reader';
import { GithubSourceListUseCase } from '../usecases/github_source.list.usecase';
import { GithubSourceDtoMapper } from '../dto/github_source.dto.mapper';
import { GithubSourceDto } from '../dto/github_source.dto';

export class TxServiceGithubSourceList {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly mapper: GithubSourceDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, mapper: GithubSourceDtoMapper): TxServiceGithubSourceList {
        return new TxServiceGithubSourceList(txManager, encryption, mapper);
    }

    async listSourcesService(userId: string): Promise<GithubSourceDto[]> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryGithubSourceReader.create(client, this.encryption);
            const useCase = GithubSourceListUseCase.create(reader, this.mapper);
            return await useCase.execute(userId);
        });
    }
}
