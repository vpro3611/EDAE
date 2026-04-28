import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';

export class ConnectionSoftDeleteUseCase {
    private moduleName = 'ConnectionSoftDeleteUseCase';

    constructor(
        private readonly connectionRepoReader: ConnectionRepoReaderInterface,
        private readonly connectionRepoWriter: ConnectionRepoWriterInterface,
    ) {}

    static create(
        connectionRepoReader: ConnectionRepoReaderInterface,
        connectionRepoWriter: ConnectionRepoWriterInterface,
    ) {
        return new ConnectionSoftDeleteUseCase(connectionRepoReader, connectionRepoWriter);
    }

    async execute(actorId: string, connectionId: string): Promise<void> {
        const connection = await this.connectionRepoReader.getConnectionById(connectionId);
        if (!connection) {
            throwAppError('Connection not found.', 404, `${this.moduleName}.execute`);
        }
        connection.ensureOwnership(actorId, 'softDelete');
        connection.ensureNotDeleted('softDelete');
        connection.softDelete();
        await this.connectionRepoWriter.softDeleteConnection(connection.id);
    }
}
