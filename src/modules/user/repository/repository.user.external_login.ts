import { ExternalLoginRepoInterface } from "../interfaces/interface.repository.external_login";
import { Pool, PoolClient } from "pg";
import { handleDatabaseError } from "../../errors/mapper.database";

export class RepositoryUserExternalLogin implements ExternalLoginRepoInterface {
  private moduleName = "RepositoryUserExternalLogin";
  constructor(private readonly db: Pool | PoolClient) {}

  static create(db: Pool | PoolClient) {
    return new RepositoryUserExternalLogin(db);
  }

  async findByProviderAndExternalId(provider: string, externalId: string): Promise<string | null> {
    try {
      const result = await this.db.query(
        "SELECT user_id FROM user_external_logins WHERE provider = $1 AND external_id = $2",
        [provider, externalId]
      );
      return result.rows[0]?.user_id || null;
    } catch (e) {
      handleDatabaseError(e, `${this.moduleName}.findByProviderAndExternalId`);
    }
  }

  async create(userId: string, provider: string, externalId: string): Promise<void> {
    try {
      await this.db.query(
        "INSERT INTO user_external_logins (user_id, provider, external_id) VALUES ($1, $2, $3)",
        [userId, provider, externalId]
      );
    } catch (e) {
      handleDatabaseError(e, `${this.moduleName}.create`);
    }
  }
}
