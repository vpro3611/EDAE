import { Pool, PoolClient } from 'pg';
import { OtpToken, TokenPurpose } from '../entity/token';
import { TokenRepoReaderInterface } from '../interfaces/interface.repository';
import { handleDatabaseError } from '../../errors/mapper.database';

export class RepositoryTokenReader implements TokenRepoReaderInterface {
    private moduleName = 'RepositoryTokenReader';

    constructor(private readonly db: Pool | PoolClient) {}

    static create(db: Pool | PoolClient): RepositoryTokenReader {
        return new RepositoryTokenReader(db);
    }

    async getActiveToken(userId: string, purpose: TokenPurpose): Promise<OtpToken | null> {
        try {
            const result = await this.db.query(
                `SELECT * FROM verification_tokens
                 WHERE user_id = $1 AND purpose = $2 AND is_used = false AND expires_at > now()
                 ORDER BY created_at DESC LIMIT 1`,
                [userId, purpose],
            );
            const row = result.rows[0];
            if (!row) return null;
            return OtpToken.restore(row);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getActiveToken`);
        }
    }
}
