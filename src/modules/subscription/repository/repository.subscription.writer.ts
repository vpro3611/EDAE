import { Pool, PoolClient } from 'pg';
import { Subscription } from '../entity/subscription';
import { SubscriptionRepoWriterInterface } from '../interfaces/interface.repository';
import { handleDatabaseError } from '../../errors/mapper.database';
import { SubscriptionEventType } from '../subscription.event_types';

export class RepositorySubscriptionWriter implements SubscriptionRepoWriterInterface {
    private moduleName = 'RepositorySubscriptionWriter';

    constructor(private readonly db: Pool | PoolClient) {}

    static create(db: Pool | PoolClient): RepositorySubscriptionWriter {
        return new RepositorySubscriptionWriter(db);
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

    async createSubscription(data: {
        github_source_id: string;
        event_type: SubscriptionEventType;
        connection_id: string;
        message_template: string;
        config: Record<string, unknown>;
    }): Promise<Subscription> {
        try {
            const result = await this.db.query(
                `INSERT INTO github_subscriptions
                    (github_source_id, event_type, connection_id, message_template, config)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [data.github_source_id, data.event_type, data.connection_id, data.message_template, JSON.stringify(data.config)],
            );
            return this.restoreHelper(result.rows[0]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.createSubscription`);
        }
    }

    async deleteSubscription(id: string): Promise<void> {
        try {
            await this.db.query('DELETE FROM github_subscriptions WHERE id = $1', [id]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.deleteSubscription: ${id}`);
        }
    }

    async updateLastSeen(id: string, lastSeen: Record<string, unknown>): Promise<void> {
        try {
            await this.db.query(
                'UPDATE github_subscriptions SET last_seen = $1, updated_at = now() WHERE id = $2',
                [lastSeen, id],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.updateLastSeen: ${id}`);
        }
    }
}
