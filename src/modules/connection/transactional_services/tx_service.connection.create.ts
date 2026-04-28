import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionWriter } from '../repository/repository.connection.writer';
import { ConnectionCreateUseCase } from '../usecases/connection.create.usecase';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';
import { ConnectionCredentials } from '../connection.credentials';

export class TxServiceConnectionCreate {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new TxServiceConnectionCreate(txManager, encryption, connectionDtoMapper);
    }

    async createConnectionService(userId: string, name: string, credentials: ConnectionCredentials): Promise<ConnectionDto> {
        return await this.txManager.runInTransaction(async (client) => {
            const writer = RepositoryConnectionWriter.create(client, this.encryption);
            const useCase = ConnectionCreateUseCase.create(writer, this.connectionDtoMapper);
            return await useCase.execute(userId, name, credentials);
        });
    }
}
