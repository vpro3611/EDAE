import { ConnectionRepoReaderInterface } from '../interfaces/interface.repository';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';

export class ConnectionListActiveUseCase {
    constructor(
        private readonly connectionRepoReader: ConnectionRepoReaderInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(connectionRepoReader: ConnectionRepoReaderInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new ConnectionListActiveUseCase(connectionRepoReader, connectionDtoMapper);
    }

    async execute(userId: string): Promise<ConnectionDto[]> {
        const connections = await this.connectionRepoReader.getActiveConnectionsByUserId(userId);
        return connections.map(c => this.connectionDtoMapper.mapToDto(c));
    }
}
