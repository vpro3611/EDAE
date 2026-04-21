import {UserRepoWriterInterface} from "../interfaces/interface.repository";
import {Pool, PoolClient} from "pg";
import {handleDatabaseError} from "../../errors/mapper.database";


export class RepositoryUserWriter implements UserRepoWriterInterface {
    constructor(private readonly db: Pool | PoolClient) {
    }

    static create(db: Pool | PoolClient) {
        return new RepositoryUserWriter(db);
    }

    async createUser(name: string, email: string, password: string): Promise<void> {
        try {
            await this.db.query("INSERT INTO users (name, email, password_hashed) VALUES ($1, $2, $3)", [name, email, password]);
        } catch (e) {
            handleDatabaseError(e, "RepositoryUserWriter.createUser");
        }
    }

    async updateUser(id: string, name: string, email: string, password: string): Promise<void> {
        try {
            await this.db.query(
                "UPDATE users SET name = $1, email = $2, password_hashed = $3, updated_at = now() WHERE id = $4",
                [name, email, password, id]
            );
        } catch (e) {
            handleDatabaseError(e, "RepositoryUserWriter.updateUser");
        }
    }

    async deleteUser(id: string): Promise<void> {
        try {
            await this.db.query("UPDATE users SET is_deleted = true, updated_at = now() WHERE id = $1", [id]);
        } catch (e) {
            handleDatabaseError(e, "RepositoryUserWriter.deleteUser");
        }
    }
}