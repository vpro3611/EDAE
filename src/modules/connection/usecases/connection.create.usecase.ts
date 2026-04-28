import { ConnectionRepoWriterInterface } from '../interfaces/interface.repository';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';
import { Connection } from '../entity/connection';
import { ConnectionCredentials } from '../connection.credentials';

export class ConnectionCreateUseCase {
    private moduleName = 'ConnectionCreateUseCase';

    constructor(
        private readonly connectionRepoWriter: ConnectionRepoWriterInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(connectionRepoWriter: ConnectionRepoWriterInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new ConnectionCreateUseCase(connectionRepoWriter, connectionDtoMapper);
    }

    async execute(userId: string, name: string, credentials: ConnectionCredentials): Promise<ConnectionDto> {
        // TODO: check provider credentials availability before persisting
        const data = Connection.createForDatabase(userId, name, credentials);
        const connection = await this.connectionRepoWriter.createConnection(data);
        return this.connectionDtoMapper.mapToDto(connection);
    }
}
