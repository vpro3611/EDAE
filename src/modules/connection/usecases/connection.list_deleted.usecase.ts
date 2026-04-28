import { ConnectionRepoReaderInterface } from '../interfaces/interface.repository';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';

export class ConnectionListDeletedUseCase {
    constructor(
        private readonly connectionRepoReader: ConnectionRepoReaderInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(connectionRepoReader: ConnectionRepoReaderInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new ConnectionListDeletedUseCase(connectionRepoReader, connectionDtoMapper);
    }

    async execute(userId: string): Promise<ConnectionDto[]> {
        const connections = await this.connectionRepoReader.getDeletedConnectionsByUserId(userId);
        return connections.map(c => this.connectionDtoMapper.mapToDto(c));
    }
}
