import {UserRepoReaderInterface} from "../interfaces/interface.repository";
import {Pool, PoolClient} from "pg";
import {User} from "../entity/user";
import {handleDatabaseError} from "../../errors/mapper.database";


export class RepositoryUserReader implements UserRepoReaderInterface {
    private moduleName = "RepositoryUserReader";
    constructor(private readonly db: Pool | PoolClient) {
    }

    static create(db: Pool | PoolClient): RepositoryUserReader {
        return new RepositoryUserReader(db);
    }

    private restoreHelper(row: any): User {
        return User.restoreUser(
            row.id,
            row.name,
            row.email,
            row.password_hashed,
            row.created_at,
            row.updated_at,
            row.is_deleted,
            row.is_verified,
            row.last_password,
            row.pending_password,
        )
    }

    async getUserById(id: string): Promise<User | null> {
        try {
            const result = await this.db.query("SELECT * FROM users WHERE id = $1 AND is_deleted = false", [id]);
            const row = result.rows[0];
            if (!row) return null;
            return this.restoreHelper(row);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getUserById: ${id}`);
        }
    }

    async getUserByEmail(email: string): Promise<User | null> {
        try {
            const result = await this.db.query("SELECT * FROM users WHERE email = $1 AND is_deleted = false", [email]);
            const row = result.rows[0];
            if (!row) return null;
            return this.restoreHelper(row);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getUserByEmail: ${email}`);
        }
    }

    async getNonDeletedUsers(): Promise<User[]> {
        try {
            const result = await this.db.query("SELECT * FROM users WHERE is_deleted = false");
            return result.rows.map(row => this.restoreHelper(row));
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getNonDeletedUsers`);
        }
    }

    async getVerifiedUsers(): Promise<User[]> {
        try {
            const result = await this.db.query("SELECT * FROM users WHERE is_deleted = false AND is_verified = true");
            return result.rows.map(row => this.restoreHelper(row));
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getVerifiedUsers`);
        }
    }
}