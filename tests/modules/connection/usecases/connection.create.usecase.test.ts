import { ConnectionCreateUseCase } from '../../../../src/modules/connection/usecases/connection.create.usecase';
import { ConnectionRepoWriterInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'chat' };

function makeConnection(id = 'conn-1') {
    return Connection.restore(id, 'user-1', 'telegram', 'My Bot', CREDS, new Date(), new Date(), false);
}

describe('ConnectionCreateUseCase', () => {
    let writer: jest.Mocked<ConnectionRepoWriterInterface>;
    let mapper: ConnectionDtoMapper;
    let useCase: ConnectionCreateUseCase;

    beforeEach(() => {
        writer = {
            createConnection: jest.fn(),
            updateConnection: jest.fn(),
            softDeleteConnection: jest.fn(),
            restoreConnection: jest.fn(),
        };
        mapper = ConnectionDtoMapper.create();
        useCase = ConnectionCreateUseCase.create(writer, mapper);
    });

    it('creates a connection and returns a DTO', async () => {
        writer.createConnection.mockResolvedValue(makeConnection());
        const dto = await useCase.execute('user-1', 'My Bot', CREDS);
        expect(dto.id).toBe('conn-1');
        expect(dto.provider).toBe('telegram');
        expect(writer.createConnection).toHaveBeenCalledWith({
            user_id: 'user-1',
            provider: 'telegram',
            name: 'My Bot',
            credentials: CREDS,
        });
    });

    it('throws 400 when name is empty', async () => {
        await expect(useCase.execute('user-1', '', CREDS)).rejects.toThrow(AppError);
        expect(writer.createConnection).not.toHaveBeenCalled();
    });

    it('throws 400 when credentials are invalid', async () => {
        const badCreds: ConnectionCredentials = { provider: 'telegram', bot_token: '', chat_id: 'c' };
        await expect(useCase.execute('user-1', 'Bot', badCreds)).rejects.toThrow(AppError);
    });
});
