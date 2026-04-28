import { ConnectionUpdateUseCase } from '../../../../src/modules/connection/usecases/connection.update.usecase';
import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

function makeConn(userId = 'actor-1', isDeleted = false) {
    return Connection.restore('conn-1', userId, 'telegram', 'Old Name', CREDS, new Date(), new Date(), isDeleted);
}

describe('ConnectionUpdateUseCase', () => {
    let reader: jest.Mocked<ConnectionRepoReaderInterface>;
    let writer: jest.Mocked<ConnectionRepoWriterInterface>;
    let useCase: ConnectionUpdateUseCase;

    beforeEach(() => {
        reader = {
            getConnectionById: jest.fn(),
            getActiveConnectionsByUserId: jest.fn(),
            getDeletedConnectionsByUserId: jest.fn(),
        };
        writer = {
            createConnection: jest.fn(),
            updateConnection: jest.fn(),
            softDeleteConnection: jest.fn(),
            restoreConnection: jest.fn(),
        };
        useCase = ConnectionUpdateUseCase.create(reader, writer, ConnectionDtoMapper.create());
    });

    it('updates name only', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn());
        writer.updateConnection.mockResolvedValue();
        const dto = await useCase.execute('actor-1', 'conn-1', { name: 'New Name' });
        expect(dto.name).toBe('New Name');
        expect(writer.updateConnection).toHaveBeenCalled();
    });

    it('updates credentials only', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn());
        writer.updateConnection.mockResolvedValue();
        const newCreds: ConnectionCredentials = { provider: 'telegram', bot_token: 'new', chat_id: 'new' };
        const dto = await useCase.execute('actor-1', 'conn-1', { credentials: newCreds });
        expect(dto.credentials).toEqual(newCreds);
    });

    it('throws 400 when neither name nor credentials is provided', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn());
        await expect(useCase.execute('actor-1', 'conn-1', {})).rejects.toThrow(AppError);
        expect(writer.updateConnection).not.toHaveBeenCalled();
    });

    it('throws 404 when connection not found', async () => {
        reader.getConnectionById.mockResolvedValue(null);
        await expect(useCase.execute('actor-1', 'conn-1', { name: 'X' })).rejects.toThrow(AppError);
    });

    it('throws 403 when actor does not own the connection', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn('other-user'));
        try {
            await useCase.execute('actor-1', 'conn-1', { name: 'X' });
            fail('expected error');
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(403);
        }
    });

    it('throws 400 when connection is deleted', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn('actor-1', true));
        await expect(useCase.execute('actor-1', 'conn-1', { name: 'X' })).rejects.toThrow(AppError);
    });
});
