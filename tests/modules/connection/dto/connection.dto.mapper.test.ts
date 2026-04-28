import { Connection } from '../../../../src/modules/connection/entity/connection';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const creds: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'chat' };

function makeConnection() {
    return Connection.restore(
        'id-1', 'user-1', 'telegram', 'My Bot', creds,
        new Date('2024-01-01'), new Date('2024-01-02'), false,
    );
}

describe('ConnectionDtoMapper', () => {
    const mapper = ConnectionDtoMapper.create();

    it('maps a Connection to ConnectionDto', () => {
        const dto = mapper.mapToDto(makeConnection());
        expect(dto).toEqual({
            id: 'id-1',
            user_id: 'user-1',
            provider: 'telegram',
            name: 'My Bot',
            credentials: creds,
            created_at: new Date('2024-01-01').toISOString(),
            updated_at: new Date('2024-01-02').toISOString(),
            is_deleted: false,
        });
    });
});
