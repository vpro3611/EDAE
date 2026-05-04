import { Pool, PoolClient } from 'pg';
import { Subscription } from '../entity/subscription';
import { SubscriptionRepoReaderInterface } from '../interfaces/interface.repository';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { handleDatabaseError } from '../../errors/mapper.database';
import { SubscriptionEventType } from '../subscription.event_types';
import { SubscriptionWithSource } from '../subscription.worker_types';

export class RepositorySubscriptionReader implements SubscriptionRepoReaderInterface {
    private moduleName = 'RepositorySubscriptionReader';

    constructor(
        private readonly db: Pool | PoolClient,
        private readonly encryption: InfraEncryptionInterface,
    ) {}

    static create(db: Pool | PoolClient, encryption: InfraEncryptionInterface): RepositorySubscriptionReader {
        return new RepositorySubscriptionReader(db, encryption);
    }

    private restoreHelper(row: any): Subscription {
        return Subscription.restore(
            row.id,
            row.github_source_id,
            row.event_type as SubscriptionEventType,
            row.connection_id,
            row.message_template,
            row.config,
            row.last_seen,
            row.is_active,
            row.created_at,
            row.updated_at,
        );
    }

    async getSubscriptionById(id: string): Promise<Subscription | null> {
        try {
            const result = await this.db.query(
                'SELECT * FROM github_subscriptions WHERE id = $1',
                [id],
            );
            const row = result.rows[0];
            if (!row) return null;
            return this.restoreHelper(row);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getSubscriptionById: ${id}`);
        }
    }

    async getSubscriptionsBySourceId(sourceId: string): Promise<Subscription[]> {
        try {
            const result = await this.db.query(
                'SELECT * FROM github_subscriptions WHERE github_source_id = $1 ORDER BY created_at ASC',
                [sourceId],
            );
            return result.rows.map(row => this.restoreHelper(row));
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getSubscriptionsBySourceId: ${sourceId}`);
        }
    }

    async getActiveSubscriptions(): Promise<SubscriptionWithSource[]> {
        try {
            const result = await this.db.query(
                `SELECT
                    gs.id AS subscription_id,
                    gs.github_source_id,
                    gs.event_type,
                    gs.connection_id,
                    gs.message_template,
                    gs.config,
                    gs.last_seen,
                    src.repo_owner,
                    src.repo_name,
                    src.access_token_encrypted
                 FROM github_subscriptions gs
                 JOIN github_sources src ON src.id = gs.github_source_id
                 JOIN connections c ON c.id = gs.connection_id
                 WHERE gs.is_active = true
                   AND c.is_deleted = false`,
            );
            return result.rows.map(row => ({
                subscription_id: row.subscription_id,
                github_source_id: row.github_source_id,
                event_type: row.event_type as SubscriptionEventType,
                connection_id: row.connection_id,
                message_template: row.message_template,
                config: row.config,
                last_seen: row.last_seen,
                repo_owner: row.repo_owner,
                repo_name: row.repo_name,
                access_token: row.access_token_encrypted
                    ? this.encryption.decrypt(row.access_token_encrypted)
                    : null,
            }));
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getActiveSubscriptions`);
        }
    }
}
