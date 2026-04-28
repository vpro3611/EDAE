import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionReader } from '../repository/repository.connection.reader';
import { ConnectionListDeletedUseCase } from '../usecases/connection.list_deleted.usecase';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';

export class TxServiceConnectionListDeleted {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new TxServiceConnectionListDeleted(txManager, encryption, connectionDtoMapper);
    }

    async listDeletedConnectionsService(userId: string): Promise<ConnectionDto[]> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryConnectionReader.create(client, this.encryption);
            const useCase = ConnectionListDeletedUseCase.create(reader, this.connectionDtoMapper);
            return await useCase.execute(userId);
        });
    }
}
