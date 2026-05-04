import { Pool, PoolClient } from 'pg';
import { GithubSource } from '../entity/github_source';
import { GithubSourceRepoReaderInterface } from '../interfaces/interface.repository';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { handleDatabaseError } from '../../errors/mapper.database';

export class RepositoryGithubSourceReader implements GithubSourceRepoReaderInterface {
    private moduleName = 'RepositoryGithubSourceReader';

    constructor(
        private readonly db: Pool | PoolClient,
        private readonly encryption: InfraEncryptionInterface,
    ) {}

    static create(db: Pool | PoolClient, encryption: InfraEncryptionInterface): RepositoryGithubSourceReader {
        return new RepositoryGithubSourceReader(db, encryption);
    }

    private restoreHelper(row: any): GithubSource {
        const token = row.access_token_encrypted
            ? this.encryption.decrypt(row.access_token_encrypted)
            : null;
        return GithubSource.restore(
            row.id,
            row.user_id,
            row.repo_owner,
            row.repo_name,
            token,
            row.created_at,
            row.updated_at,
        );
    }

    async getSourceById(id: string): Promise<GithubSource | null> {
        try {
            const result = await this.db.query(
                'SELECT * FROM github_sources WHERE id = $1',
                [id],
            );
            const row = result.rows[0];
            if (!row) return null;
            return this.restoreHelper(row);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getSourceById: ${id}`);
        }
    }

    async getSourcesByUserId(userId: string): Promise<GithubSource[]> {
        try {
            const result = await this.db.query(
                'SELECT * FROM github_sources WHERE user_id = $1 ORDER BY created_at ASC',
                [userId],
            );
            return result.rows.map(row => this.restoreHelper(row));
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getSourcesByUserId: ${userId}`);
        }
    }
}
