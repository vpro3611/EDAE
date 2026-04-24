import { Pool, PoolClient } from 'pg';
import { TokenPurpose } from '../entity/token';
import { TokenRepoWriterInterface } from '../interfaces/interface.repository';
import { handleDatabaseError } from '../../errors/mapper.database';

export class RepositoryTokenWriter implements TokenRepoWriterInterface {
    private moduleName = 'RepositoryTokenWriter';

    constructor(private readonly db: Pool | PoolClient) {}

    static create(db: Pool | PoolClient): RepositoryTokenWriter {
        return new RepositoryTokenWriter(db);
    }

    async createToken(data: { user_id: string; otp_hash: string; purpose: TokenPurpose; expires_at: Date }): Promise<void> {
        try {
            await this.db.query(
                'INSERT INTO verification_tokens (user_id, otp_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)',
                [data.user_id, data.otp_hash, data.purpose, data.expires_at],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.createToken`);
        }
    }

    async invalidatePreviousTokens(userId: string, purpose: TokenPurpose): Promise<void> {
        try {
            await this.db.query(
                'UPDATE verification_tokens SET is_used = true WHERE user_id = $1 AND purpose = $2 AND is_used = false',
                [userId, purpose],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.invalidatePreviousTokens`);
        }
    }

    async markTokenAsUsed(id: string): Promise<void> {
        try {
            await this.db.query('UPDATE verification_tokens SET is_used = true WHERE id = $1', [id]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.markTokenAsUsed`);
        }
    }
}
