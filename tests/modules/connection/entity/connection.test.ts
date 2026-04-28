import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const TELEGRAM_CREDS: ConnectionCredentials = {
    provider: 'telegram',
    bot_token: 'bot123',
    chat_id: 'chat456',
};

const SLACK_CREDS: ConnectionCredentials = {
    provider: 'slack',
    webhook_url: 'https://hooks.slack.com/test',
};

const EMAIL_CREDS: ConnectionCredentials = {
    provider: 'email',
    address: 'user@example.com',
};

function makeConnection(overrides: Partial<{
    id: string; user_id: string; provider: string; name: string;
    credentials: ConnectionCredentials; is_deleted: boolean;
}> = {}) {
    return Connection.restore(
        overrides.id ?? 'conn-uuid-1',
        overrides.user_id ?? 'user-uuid-1',
        overrides.provider ?? 'telegram',
        overrides.name ?? 'My Bot',
        overrides.credentials ?? TELEGRAM_CREDS,
        new Date(),
        new Date(),
        overrides.is_deleted ?? false,
    );
}

describe('Connection Entity', () => {

    describe('createForDatabase', () => {
        it('returns insert-ready object with provider derived from credentials', () => {
            const result = Connection.createForDatabase('user-1', 'My Bot', TELEGRAM_CREDS);
            expect(result).toEqual({
                user_id: 'user-1',
                provider: 'telegram',
                name: 'My Bot',
                credentials: TELEGRAM_CREDS,
            });
        });

        it('throws 400 when name is empty', () => {
            expect(() => Connection.createForDatabase('user-1', '', TELEGRAM_CREDS))
                .toThrow(AppError);
        });

        it('throws 400 when telegram bot_token is empty', () => {
            expect(() =>
                Connection.createForDatabase('user-1', 'Bot', {
                    provider: 'telegram', bot_token: '', chat_id: '123',
                }),
            ).toThrow(AppError);
        });

        it('throws 400 when slack webhook_url is not a valid URL', () => {
            expect(() =>
                Connection.createForDatabase('user-1', 'Slack', {
                    provider: 'slack', webhook_url: 'not-a-url',
                }),
            ).toThrow(AppError);
        });

        it('throws 400 when email address is invalid', () => {
            expect(() =>
                Connection.createForDatabase('user-1', 'Email', {
                    provider: 'email', address: 'notanemail',
                }),
            ).toThrow(AppError);
        });
    });

    describe('restore', () => {
        it('creates a Connection instance from valid data', () => {
            const conn = makeConnection();
            expect(conn).toBeInstanceOf(Connection);
            expect(conn.id).toBe('conn-uuid-1');
        });
    });

    describe('ensureNotDeleted', () => {
        it('does not throw when is_deleted is false', () => {
            expect(() => makeConnection().ensureNotDeleted('op')).not.toThrow();
        });

        it('throws 400 when is_deleted is true', () => {
            const conn = makeConnection({ is_deleted: true });
            expect(() => conn.ensureNotDeleted('op')).toThrow(AppError);
        });
    });

    describe('ensureIsDeleted', () => {
        it('throws 400 when is_deleted is false', () => {
            expect(() => makeConnection().ensureIsDeleted('op')).toThrow(AppError);
        });

        it('does not throw when is_deleted is true', () => {
            const conn = makeConnection({ is_deleted: true });
            expect(() => conn.ensureIsDeleted('op')).not.toThrow();
        });
    });

    describe('ensureOwnership', () => {
        it('does not throw when actorId matches user_id', () => {
            const conn = makeConnection({ user_id: 'actor-1' });
            expect(() => conn.ensureOwnership('actor-1', 'op')).not.toThrow();
        });

        it('throws 403 when actorId does not match user_id', () => {
            const conn = makeConnection({ user_id: 'actor-1' });
            try {
                conn.ensureOwnership('other-actor', 'op');
                fail('expected error');
            } catch (e: any) {
                expect(e).toBeInstanceOf(AppError);
                expect(e.statusCode).toBe(403);
            }
        });
    });

    describe('updateName', () => {
        it('mutates name when valid', () => {
            const conn = makeConnection();
            conn.updateName('New Name');
            expect(conn.name).toBe('New Name');
        });

        it('throws 400 when name is empty', () => {
            expect(() => makeConnection().updateName('')).toThrow(AppError);
        });
    });

    describe('updateCredentials', () => {
        it('mutates credentials when valid and same provider', () => {
            const conn = makeConnection();
            const newCreds: ConnectionCredentials = {
                provider: 'telegram', bot_token: 'new-tok', chat_id: 'new-chat',
            };
            conn.updateCredentials(newCreds);
            expect(conn.credentials).toEqual(newCreds);
        });

        it('throws 400 when provider changes', () => {
            const conn = makeConnection({ provider: 'telegram', credentials: TELEGRAM_CREDS });
            expect(() => conn.updateCredentials(SLACK_CREDS)).toThrow(AppError);
        });
    });

    describe('softDelete', () => {
        it('sets is_deleted to true', () => {
            const conn = makeConnection();
            conn.softDelete();
            expect(conn.is_deleted).toBe(true);
        });
    });

    describe('restore', () => {
        it('sets is_deleted to false', () => {
            const conn = makeConnection({ is_deleted: true });
            conn.restore();
            expect(conn.is_deleted).toBe(false);
        });
    });

    describe('ConnectionValidator.validateCredentials', () => {
        it('accepts valid slack credentials', () => {
            expect(() => Connection.createForDatabase('u', 'n', SLACK_CREDS)).not.toThrow();
        });

        it('accepts valid email credentials', () => {
            expect(() => Connection.createForDatabase('u', 'n', EMAIL_CREDS)).not.toThrow();
        });

        it('throws 400 when telegram chat_id is empty', () => {
            expect(() =>
                Connection.createForDatabase('u', 'n', {
                    provider: 'telegram', bot_token: 'tok', chat_id: '',
                }),
            ).toThrow(AppError);
        });

        it('throws 400 when email address is empty string', () => {
            expect(() =>
                Connection.createForDatabase('u', 'n', { provider: 'email', address: '' }),
            ).toThrow(AppError);
        });
    });
});
