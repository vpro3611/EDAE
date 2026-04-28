import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../interfaces/interface.repository';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';
import { ConnectionCredentials } from '../connection.credentials';
import { throwAppError } from '../../errors/errors.global';

export class ConnectionUpdateUseCase {
    private moduleName = 'ConnectionUpdateUseCase';

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
        return new ConnectionUpdateUseCase(connectionRepoReader, connectionRepoWriter, connectionDtoMapper);
    }

    async execute(
        actorId: string,
        connectionId: string,
        fields: { name?: string; credentials?: ConnectionCredentials },
    ): Promise<ConnectionDto> {
        if (!fields.name && !fields.credentials) {
            throwAppError('At least one field must be provided.', 400, `${this.moduleName}.execute`);
        }

        const connection = await this.connectionRepoReader.getConnectionById(connectionId);
        if (!connection) {
            throwAppError('Connection not found.', 404, `${this.moduleName}.execute`);
        }

        connection.ensureOwnership(actorId, 'update');
        connection.ensureNotDeleted('update');

        if (fields.name) connection.updateName(fields.name);
        if (fields.credentials) connection.updateCredentials(fields.credentials);

        // TODO Feature: check provider credentials availability before updating, i.e. send request to there to check if this actually correct.

        await this.connectionRepoWriter.updateConnection(connection);
        return this.connectionDtoMapper.mapToDto(connection);
    }
}
