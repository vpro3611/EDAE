import { Connection } from '../entity/connection';
import { ConnectionDto } from './connection.dto';

export class ConnectionDtoMapper {
    static create(): ConnectionDtoMapper {
        return new ConnectionDtoMapper();
    }

    mapToDto(connection: Connection): ConnectionDto {
        return {
            id: connection.id,
            user_id: connection.user_id,
            provider: connection.provider,
            name: connection.name,
            credentials: connection.credentials,
            created_at: connection.created_at.toISOString(),
            updated_at: connection.updated_at.toISOString(),
            is_deleted: connection.is_deleted,
        };
    }
}
