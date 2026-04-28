import { ConnectionListActiveUseCase } from '../../../../src/modules/connection/usecases/connection.list_active.usecase';
import { ConnectionRepoReaderInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

function makeConn(id: string) {
    return Connection.restore(id, 'user-1', 'telegram', 'Bot', CREDS, new Date(), new Date(), false);
}

describe('ConnectionListActiveUseCase', () => {
    let reader: jest.Mocked<ConnectionRepoReaderInterface>;
    let useCase: ConnectionListActiveUseCase;

    beforeEach(() => {
        reader = {
            getConnectionById: jest.fn(),
            getActiveConnectionsByUserId: jest.fn(),
            getDeletedConnectionsByUserId: jest.fn(),
        };
        useCase = ConnectionListActiveUseCase.create(reader, ConnectionDtoMapper.create());
    });

    it('returns DTOs for all active connections', async () => {
        reader.getActiveConnectionsByUserId.mockResolvedValue([makeConn('a'), makeConn('b')]);
        const dtos = await useCase.execute('user-1');
        expect(dtos).toHaveLength(2);
        expect(dtos[0].id).toBe('a');
        expect(reader.getActiveConnectionsByUserId).toHaveBeenCalledWith('user-1');
    });

    it('returns empty array when no active connections', async () => {
        reader.getActiveConnectionsByUserId.mockResolvedValue([]);
        const dtos = await useCase.execute('user-1');
        expect(dtos).toEqual([]);
    });
});
