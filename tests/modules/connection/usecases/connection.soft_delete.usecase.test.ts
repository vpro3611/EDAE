import { ConnectionSoftDeleteUseCase } from '../../../../src/modules/connection/usecases/connection.soft_delete.usecase';
import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

function makeConn(userId = 'actor-1', isDeleted = false) {
    return Connection.restore('conn-1', userId, 'telegram', 'Bot', CREDS, new Date(), new Date(), isDeleted);
}

describe('ConnectionSoftDeleteUseCase', () => {
    let reader: jest.Mocked<ConnectionRepoReaderInterface>;
    let writer: jest.Mocked<ConnectionRepoWriterInterface>;
    let useCase: ConnectionSoftDeleteUseCase;

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
        useCase = ConnectionSoftDeleteUseCase.create(reader, writer);
    });

    it('soft-deletes an owned active connection', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn());
        writer.softDeleteConnection.mockResolvedValue();
        await useCase.execute('actor-1', 'conn-1');
        expect(writer.softDeleteConnection).toHaveBeenCalledWith('conn-1');
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

    it('throws 400 when connection is already deleted', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn('actor-1', true));
        await expect(useCase.execute('actor-1', 'conn-1')).rejects.toThrow(AppError);
    });
});
