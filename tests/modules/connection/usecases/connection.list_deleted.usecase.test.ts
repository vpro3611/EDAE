import { ConnectionListDeletedUseCase } from '../../../../src/modules/connection/usecases/connection.list_deleted.usecase';
import { ConnectionRepoReaderInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

function makeDeletedConn(id: string) {
    return Connection.restore(id, 'user-1', 'telegram', 'Bot', CREDS, new Date(), new Date(), true);
}

describe('ConnectionListDeletedUseCase', () => {
    let reader: jest.Mocked<ConnectionRepoReaderInterface>;
    let useCase: ConnectionListDeletedUseCase;

    beforeEach(() => {
        reader = {
            getConnectionById: jest.fn(),
            getActiveConnectionsByUserId: jest.fn(),
            getDeletedConnectionsByUserId: jest.fn(),
        };
        useCase = ConnectionListDeletedUseCase.create(reader, ConnectionDtoMapper.create());
    });

    it('returns DTOs for all deleted connections', async () => {
        reader.getDeletedConnectionsByUserId.mockResolvedValue([makeDeletedConn('x')]);
        const dtos = await useCase.execute('user-1');
        expect(dtos).toHaveLength(1);
        expect(dtos[0].is_deleted).toBe(true);
    });
});
