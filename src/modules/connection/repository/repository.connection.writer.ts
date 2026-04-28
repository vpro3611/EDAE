import { Pool, PoolClient } from 'pg';
import { Connection } from '../entity/connection';
import { ConnectionRepoWriterInterface } from '../interfaces/interface.repository';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { handleDatabaseError } from '../../errors/mapper.database';
import { ConnectionCredentials } from '../connection.credentials';

export class RepositoryConnectionWriter implements ConnectionRepoWriterInterface {
    private moduleName = 'RepositoryConnectionWriter';

    constructor(
        private readonly db: Pool | PoolClient,
        private readonly encryption: InfraEncryptionInterface,
    ) {}

    static create(db: Pool | PoolClient, encryption: InfraEncryptionInterface): RepositoryConnectionWriter {
        return new RepositoryConnectionWriter(db, encryption);
    }

    private encrypt(credentials: ConnectionCredentials): object {
        return { e: this.encryption.encrypt(JSON.stringify(credentials)) };
    }

    private restoreHelper(row: any): Connection {
        const credentials: ConnectionCredentials = JSON.parse(
            this.encryption.decrypt(row.credentials.e),
        );
        return Connection.restore(
            row.id,
            row.user_id,
            row.provider,
            row.name,
            credentials,
            row.created_at,
            row.updated_at,
            row.is_deleted,
        );
    }

    async createConnection(data: {
        user_id: string;
        provider: string;
        name: string;
        credentials: ConnectionCredentials;
    }): Promise<Connection> {
        try {
            const result = await this.db.query(
                `INSERT INTO connections (user_id, provider, name, credentials)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [data.user_id, data.provider, data.name, this.encrypt(data.credentials)],
            );
            return this.restoreHelper(result.rows[0]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.createConnection`);
        }
    }

    async updateConnection(connection: Connection): Promise<void> {
        try {
            await this.db.query(
                `UPDATE connections SET name = $1, credentials = $2, updated_at = now() WHERE id = $3`,
                [connection.name, this.encrypt(connection.credentials), connection.id],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.updateConnection: ${connection.id}`);
        }
    }

    async softDeleteConnection(id: string): Promise<void> {
        try {
            await this.db.query(
                'UPDATE connections SET is_deleted = true, updated_at = now() WHERE id = $1',
                [id],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.softDeleteConnection: ${id}`);
        }
    }

    async restoreConnection(id: string): Promise<void> {
        try {
            await this.db.query(
                'UPDATE connections SET is_deleted = false, updated_at = now() WHERE id = $1',
                [id],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.restoreConnection: ${id}`);
        }
    }
}
