import { Pool, PoolClient } from 'pg';
import { Connection } from '../entity/connection';
import { ConnectionRepoReaderInterface } from '../interfaces/interface.repository';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { handleDatabaseError } from '../../errors/mapper.database';
import { ConnectionCredentials } from '../connection.credentials';

export class RepositoryConnectionReader implements ConnectionRepoReaderInterface {
    private moduleName = 'RepositoryConnectionReader';

    constructor(
        private readonly db: Pool | PoolClient,
        private readonly encryption: InfraEncryptionInterface,
    ) {}

    static create(db: Pool | PoolClient, encryption: InfraEncryptionInterface): RepositoryConnectionReader {
        return new RepositoryConnectionReader(db, encryption);
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

    async getConnectionById(id: string): Promise<Connection | null> {
        try {
            const result = await this.db.query(
                'SELECT * FROM connections WHERE id = $1',
                [id],
            );
            const row = result.rows[0];
            if (!row) return null;
            return this.restoreHelper(row);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getConnectionById: ${id}`);
        }
    }

    async getActiveConnectionsByUserId(userId: string): Promise<Connection[]> {
        try {
            const result = await this.db.query(
                'SELECT * FROM connections WHERE user_id = $1 AND is_deleted = false',
                [userId],
            );
            return result.rows.map(row => this.restoreHelper(row));
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getActiveConnectionsByUserId: ${userId}`);
        }
    }

    async getDeletedConnectionsByUserId(userId: string): Promise<Connection[]> {
        try {
            const result = await this.db.query(
                'SELECT * FROM connections WHERE user_id = $1 AND is_deleted = true',
                [userId],
            );
            return result.rows.map(row => this.restoreHelper(row));
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getDeletedConnectionsByUserId: ${userId}`);
        }
    }
}
