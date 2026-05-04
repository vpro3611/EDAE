import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryGithubSourceReader } from '../../github_source/repository/repository.github_source.reader';
import { RepositorySubscriptionReader } from '../repository/repository.subscription.reader';
import { RepositorySubscriptionWriter } from '../repository/repository.subscription.writer';
import { SubscriptionDeleteUseCase } from '../usecases/subscription.delete.usecase';

export class TxServiceSubscriptionDelete {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface): TxServiceSubscriptionDelete {
        return new TxServiceSubscriptionDelete(txManager, encryption);
    }

    async deleteSubscriptionService(actorId: string, subscriptionId: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const sourceReader = RepositoryGithubSourceReader.create(client, this.encryption);
            const reader = RepositorySubscriptionReader.create(client, this.encryption);
            const writer = RepositorySubscriptionWriter.create(client);
            const useCase = SubscriptionDeleteUseCase.create(sourceReader, reader, writer);
            return await useCase.execute(actorId, subscriptionId);
        });
    }
}
