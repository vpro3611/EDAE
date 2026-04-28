import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionReader } from '../repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../repository/repository.connection.writer';
import { ConnectionRestoreUseCase } from '../usecases/connection.restore.usecase';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';

export class TxServiceConnectionRestore {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new TxServiceConnectionRestore(txManager, encryption, connectionDtoMapper);
    }

    async restoreConnectionService(actorId: string, connectionId: string): Promise<ConnectionDto> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryConnectionReader.create(client, this.encryption);
            const writer = RepositoryConnectionWriter.create(client, this.encryption);
            const useCase = ConnectionRestoreUseCase.create(reader, writer, this.connectionDtoMapper);
            return await useCase.execute(actorId, connectionId);
        });
    }
}
