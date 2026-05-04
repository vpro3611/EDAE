import { Pool, PoolClient } from 'pg';
import { GithubSource } from '../entity/github_source';
import { GithubSourceRepoWriterInterface } from '../interfaces/interface.repository';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { handleDatabaseError } from '../../errors/mapper.database';

export class RepositoryGithubSourceWriter implements GithubSourceRepoWriterInterface {
    private moduleName = 'RepositoryGithubSourceWriter';

    constructor(
        private readonly db: Pool | PoolClient,
        private readonly encryption: InfraEncryptionInterface,
    ) {}

    static create(db: Pool | PoolClient, encryption: InfraEncryptionInterface): RepositoryGithubSourceWriter {
        return new RepositoryGithubSourceWriter(db, encryption);
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

    async createSource(data: {
        user_id: string;
        repo_owner: string;
        repo_name: string;
        access_token: string | null;
    }): Promise<GithubSource> {
        try {
            const encryptedToken = data.access_token
                ? this.encryption.encrypt(data.access_token)
                : null;
            const result = await this.db.query(
                `INSERT INTO github_sources (user_id, repo_owner, repo_name, access_token_encrypted)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [data.user_id, data.repo_owner, data.repo_name, encryptedToken],
            );
            return this.restoreHelper(result.rows[0]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.createSource`);
        }
    }

    async deleteSource(id: string): Promise<void> {
        try {
            await this.db.query('DELETE FROM github_sources WHERE id = $1', [id]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.deleteSource: ${id}`);
        }
    }
}
