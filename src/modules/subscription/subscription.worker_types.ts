import { SubscriptionEventType } from './subscription.event_types';

export type SubscriptionWithSource = {
    subscription_id: string;
    github_source_id: string;
    event_type: SubscriptionEventType;
    connection_id: string;
    message_template: string;
    config: Record<string, unknown>;
    last_seen: Record<string, unknown>;
    repo_owner: string;
    repo_name: string;
    access_token: string | null;
};
