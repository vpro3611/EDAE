import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryGithubSourceReader } from '../../github_source/repository/repository.github_source.reader';
import { RepositorySubscriptionWriter } from '../repository/repository.subscription.writer';
import { SubscriptionCreateUseCase } from '../usecases/subscription.create.usecase';
import { SubscriptionDtoMapper } from '../dto/subscription.dto.mapper';
import { SubscriptionDto } from '../dto/subscription.dto';
import { SubscriptionEventType } from '../subscription.event_types';

export class TxServiceSubscriptionCreate {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly mapper: SubscriptionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, mapper: SubscriptionDtoMapper): TxServiceSubscriptionCreate {
        return new TxServiceSubscriptionCreate(txManager, encryption, mapper);
    }

    async createSubscriptionService(
        actorId: string,
        githubSourceId: string,
        eventType: SubscriptionEventType,
        connectionId: string,
        messageTemplate: string,
        config: Record<string, unknown>,
    ): Promise<SubscriptionDto> {
        return await this.txManager.runInTransaction(async (client) => {
            const sourceReader = RepositoryGithubSourceReader.create(client, this.encryption);
            const writer = RepositorySubscriptionWriter.create(client);
            const useCase = SubscriptionCreateUseCase.create(sourceReader, writer, this.mapper);
            return await useCase.execute(actorId, githubSourceId, eventType, connectionId, messageTemplate, config);
        });
    }
}
