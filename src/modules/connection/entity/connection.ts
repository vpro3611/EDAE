import { ConnectionValidator } from './connection.validator';
import { throwAppError } from '../../errors/errors.global';
import { ConnectionCredentials } from '../connection.credentials';

export class Connection {
    private moduleName = 'ConnectionDomain';

    constructor(
        public id: string,
        public user_id: string,
        public provider: string,
        public name: string,
        public credentials: ConnectionCredentials,
        public created_at: Date,
        public updated_at: Date,
        public is_deleted: boolean,
    ) {}

    static createForDatabase(
        userId: string,
        name: string,
        credentials: ConnectionCredentials,
    ): { user_id: string; provider: string; name: string; credentials: ConnectionCredentials } {
        ConnectionValidator.validateName(name);
        ConnectionValidator.validateCredentials(credentials);
        return { user_id: userId, provider: credentials.provider, name, credentials };
    }

    static restore(
        id: string,
        user_id: string,
        provider: string,
        name: string,
        credentials: ConnectionCredentials,
        created_at: Date,
        updated_at: Date,
        is_deleted: boolean,
    ): Connection {
        ConnectionValidator.validateName(name);
        ConnectionValidator.validateCredentials(credentials);
        return new Connection(id, user_id, provider, name, credentials, created_at, updated_at, is_deleted);
    }

    ensureNotDeleted(op: string): void {
        if (this.is_deleted) {
            throwAppError('Connection is deleted.', 400, `${this.moduleName}.${op}`);
        }
    }

    ensureIsDeleted(op: string): void {
        if (!this.is_deleted) {
            throwAppError('Connection is not deleted.', 400, `${this.moduleName}.${op}`);
        }
    }

    ensureOwnership(actorId: string, op: string): void {
        if (this.user_id !== actorId) {
            throwAppError('Forbidden.', 403, `${this.moduleName}.${op}`);
        }
    }

    updateName(name: string): void {
        ConnectionValidator.validateName(name);
        this.name = name;
    }

    updateCredentials(credentials: ConnectionCredentials): void {
        if (credentials.provider !== this.provider) {
            throwAppError('Provider cannot be changed.', 400, `${this.moduleName}.updateCredentials`);
        }
        ConnectionValidator.validateCredentials(credentials);

        this.credentials = credentials;
    }

    softDelete(): void {
        this.is_deleted = true;
    }

    restore(): void {

        this.is_deleted = false;
    }
}
