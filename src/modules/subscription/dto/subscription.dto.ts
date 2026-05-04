import { SubscriptionEventType } from '../subscription.event_types';

export type SubscriptionDto = {
    id: string;
    github_source_id: string;
    event_type: SubscriptionEventType;
    connection_id: string;
    message_template: string;
    config: Record<string, unknown>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};
