import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryGithubSourceReader } from '../repository/repository.github_source.reader';
import { RepositoryGithubSourceWriter } from '../repository/repository.github_source.writer';
import { GithubSourceDeleteUseCase } from '../usecases/github_source.delete.usecase';

export class TxServiceGithubSourceDelete {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface): TxServiceGithubSourceDelete {
        return new TxServiceGithubSourceDelete(txManager, encryption);
    }

    async deleteSourceService(actorId: string, sourceId: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryGithubSourceReader.create(client, this.encryption);
            const writer = RepositoryGithubSourceWriter.create(client, this.encryption);
            const useCase = GithubSourceDeleteUseCase.create(reader, writer);
            return await useCase.execute(actorId, sourceId);
        });
    }
}
