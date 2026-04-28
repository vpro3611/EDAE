import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../interfaces/interface.repository';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';
import { throwAppError } from '../../errors/errors.global';

export class ConnectionRestoreUseCase {
    private moduleName = 'ConnectionRestoreUseCase';

    constructor(
        private readonly connectionRepoReader: ConnectionRepoReaderInterface,
        private readonly connectionRepoWriter: ConnectionRepoWriterInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(
        connectionRepoReader: ConnectionRepoReaderInterface,
        connectionRepoWriter: ConnectionRepoWriterInterface,
        connectionDtoMapper: ConnectionDtoMapper,
    ) {
        return new ConnectionRestoreUseCase(connectionRepoReader, connectionRepoWriter, connectionDtoMapper);
    }

    async execute(actorId: string, connectionId: string): Promise<ConnectionDto> {
        const connection = await this.connectionRepoReader.getConnectionById(connectionId);
        if (!connection) {
            throwAppError('Connection not found.', 404, `${this.moduleName}.execute`);
        }
        connection.ensureOwnership(actorId, 'restore');
        connection.ensureIsDeleted('restore');

        connection.restore();
        await this.connectionRepoWriter.restoreConnection(connection.id);
        return this.connectionDtoMapper.mapToDto(connection);
    }
}
