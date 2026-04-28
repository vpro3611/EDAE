import { ConnectionRestoreUseCase } from '../../../../src/modules/connection/usecases/connection.restore.usecase';
import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

function makeConn(userId = 'actor-1', isDeleted = true) {
    return Connection.restore('conn-1', userId, 'telegram', 'Bot', CREDS, new Date(), new Date(), isDeleted);
}

describe('ConnectionRestoreUseCase', () => {
    let reader: jest.Mocked<ConnectionRepoReaderInterface>;
    let writer: jest.Mocked<ConnectionRepoWriterInterface>;
    let useCase: ConnectionRestoreUseCase;

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
        useCase = ConnectionRestoreUseCase.create(reader, writer, ConnectionDtoMapper.create());
    });

    it('restores an owned deleted connection and returns DTO', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn());
        writer.restoreConnection.mockResolvedValue();
        const dto = await useCase.execute('actor-1', 'conn-1');
        expect(dto.is_deleted).toBe(false);
        expect(writer.restoreConnection).toHaveBeenCalledWith('conn-1');
    });

    it('throws 404 when connection not found', async () => {
        reader.getConnectionById.mockResolvedValue(null);
        await expect(useCase.execute('actor-1', 'conn-1')).rejects.toThrow(AppError);
    });

    it('throws 403 when actor does not own the connection', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn('other-user'));
        try {
            await useCase.execute('actor-1', 'conn-1');
            fail('expected error');
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(403);
        }
    });

    it('throws 400 when connection is not deleted', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn('actor-1', false));
        await expect(useCase.execute('actor-1', 'conn-1')).rejects.toThrow(AppError);
    });
});
