import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionReader } from '../repository/repository.connection.reader';
import { ConnectionListActiveUseCase } from '../usecases/connection.list_active.usecase';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';

export class TxServiceConnectionListActive {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new TxServiceConnectionListActive(txManager, encryption, connectionDtoMapper);
    }

    async listActiveConnectionsService(userId: string): Promise<ConnectionDto[]> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryConnectionReader.create(client, this.encryption);
            const useCase = ConnectionListActiveUseCase.create(reader, this.connectionDtoMapper);
            return await useCase.execute(userId);
        });
    }
}
