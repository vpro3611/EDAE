import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionReader } from '../repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../repository/repository.connection.writer';
import { ConnectionSoftDeleteUseCase } from '../usecases/connection.soft_delete.usecase';

export class TxServiceConnectionSoftDelete {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface) {
        return new TxServiceConnectionSoftDelete(txManager, encryption);
    }

    async softDeleteConnectionService(actorId: string, connectionId: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryConnectionReader.create(client, this.encryption);
            const writer = RepositoryConnectionWriter.create(client, this.encryption);
            const useCase = ConnectionSoftDeleteUseCase.create(reader, writer);
            return await useCase.execute(actorId, connectionId);
        });
    }
}
