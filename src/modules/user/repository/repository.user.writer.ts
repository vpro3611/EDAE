import {UserRepoWriterInterface} from "../interfaces/interface.repository";
import {Pool, PoolClient} from "pg";
import {handleDatabaseError} from "../../errors/mapper.database";
import {User} from "../entity/user";


export class RepositoryUserWriter implements UserRepoWriterInterface {
    constructor(private readonly db: Pool | PoolClient) {
    }

    private moduleName = "RepositoryUserWriter";

    static create(db: Pool | PoolClient) {
        return new RepositoryUserWriter(db);
    }

    async createUser(user: { name: string, email: string, password_hashed: string, last_password: string }): Promise<void> {
        try {
            await this.db.query("INSERT INTO users (name, email, password_hashed, last_password) VALUES ($1, $2, $3, $4)",
                [user.name, user.email, user.password_hashed, user.last_password]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.createUser: ${user.email}`);
        }
    }

    async updateUser(user: User): Promise<void> {
        try {
            await this.db.query(
                "UPDATE users SET name = $1, email = $2, password_hashed = $3, updated_at = now(), last_password = $4, pending_password = $5 WHERE id = $6",
                [user.name, user.email, user.password_hashed, user.last_password, user.pending_password, user.id]
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.updateUser: ${user.id} ${user.email}`);
        }
    }

    async deleteUser(id: string): Promise<void> {
        try {
            await this.db.query("UPDATE users SET is_deleted = true, updated_at = now() WHERE id = $1", [id]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.deleteUser: ${id}`);
        }
    }

    async markUserAsVerified(id: string): Promise<void> {
        try {
            await this.db.query("UPDATE users SET is_verified = true, updated_at = now() WHERE id = $1 AND is_deleted = false", [id]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.markUserAsVerified: ${id}`);
        }
    }
}