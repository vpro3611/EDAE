import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionReader } from '../repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../repository/repository.connection.writer';
import { ConnectionUpdateUseCase } from '../usecases/connection.update.usecase';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';
import { ConnectionCredentials } from '../connection.credentials';

export class TxServiceConnectionUpdate {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new TxServiceConnectionUpdate(txManager, encryption, connectionDtoMapper);
    }

    async updateConnectionService(
        actorId: string,
        connectionId: string,
        fields: { name?: string; credentials?: ConnectionCredentials },
    ): Promise<ConnectionDto> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryConnectionReader.create(client, this.encryption);
            const writer = RepositoryConnectionWriter.create(client, this.encryption);
            const useCase = ConnectionUpdateUseCase.create(reader, writer, this.connectionDtoMapper);
            return await useCase.execute(actorId, connectionId, fields);
        });
    }
}
