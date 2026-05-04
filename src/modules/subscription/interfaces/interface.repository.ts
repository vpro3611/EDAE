import { Subscription } from '../entity/subscription';
import { SubscriptionEventType } from '../subscription.event_types';
import { SubscriptionWithSource } from '../subscription.worker_types';

export interface SubscriptionRepoReaderInterface {
    getSubscriptionById(id: string): Promise<Subscription | null>;
    getSubscriptionsBySourceId(sourceId: string): Promise<Subscription[]>;
    getActiveSubscriptions(): Promise<SubscriptionWithSource[]>;
}

export interface SubscriptionRepoWriterInterface {
    createSubscription(data: {
        github_source_id: string;
        event_type: SubscriptionEventType;
        connection_id: string;
        message_template: string;
        config: Record<string, unknown>;
    }): Promise<Subscription>;
    deleteSubscription(id: string): Promise<void>;
    updateLastSeen(id: string, lastSeen: Record<string, unknown>): Promise<void>;
}
