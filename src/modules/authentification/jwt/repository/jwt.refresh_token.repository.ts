import {Pool, PoolClient} from "pg";
import {handleDatabaseError} from "../../../errors/mapper.database";
import {JwtRefreshTokenRepositoryInterface} from "../interfaces/jwt.refresh_token.repository.interface";
import {JwtTokenDto} from "../dto/jwt.token.dto";

export class JwtRefreshTokenRepository implements JwtRefreshTokenRepositoryInterface {

    private moduleName = "JwtRefreshTokenRepository";

    constructor(private readonly db: Pool | PoolClient) {
    }

    private restoreHelper(row: any): JwtTokenDto {
        return {
            id: row.id,
            userId: row.user_id,
            tokenHash: row.token_hash,
            expiresAt: row.expires_at,
            revokedAt: row.revoked_at,
            createdAt: row.created_at
        }
    }

    static create(db: Pool | PoolClient) {
        return new JwtRefreshTokenRepository(db);
    }

    async create(data: {userId: string, tokenHash: string, expiresAt: Date}): Promise<void> {
        try {
            await this.db.query("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
                [data.userId, data.tokenHash, data.expiresAt]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.create: ${data.userId}`);
        }
    }

    async findValidByHash(tokenHash: string): Promise<JwtTokenDto | null> {
        try {
            const res=  await this.db.query(
                "SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL and expires_at > NOW() LIMIT 1", [tokenHash]);

            const row = res.rows[0];

            if (!row) return null;
            return this.restoreHelper(row);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.findValidByHash`);
        }
    }

    async revokeByHash(tokenHash: string): Promise<void> {
        try {
            await this.db.query("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1", [tokenHash]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.revokeByHash`);
        }
    }

    async revokeById(id: string): Promise<void> {
        try {
            await this.db.query("UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1", [id]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.revokeById: ${id}`);
        }
    }
}