import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryGithubSourceReader } from '../../github_source/repository/repository.github_source.reader';
import { RepositorySubscriptionReader } from '../repository/repository.subscription.reader';
import { SubscriptionListUseCase } from '../usecases/subscription.list.usecase';
import { SubscriptionDtoMapper } from '../dto/subscription.dto.mapper';
import { SubscriptionDto } from '../dto/subscription.dto';

export class TxServiceSubscriptionList {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly mapper: SubscriptionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, mapper: SubscriptionDtoMapper): TxServiceSubscriptionList {
        return new TxServiceSubscriptionList(txManager, encryption, mapper);
    }

    async listSubscriptionsService(actorId: string, sourceId: string): Promise<SubscriptionDto[]> {
        return await this.txManager.runInTransaction(async (client) => {
            const sourceReader = RepositoryGithubSourceReader.create(client, this.encryption);
            const reader = RepositorySubscriptionReader.create(client, this.encryption);
            const useCase = SubscriptionListUseCase.create(sourceReader, reader, this.mapper);
            return await useCase.execute(actorId, sourceId);
        });
    }
}
