import { SubscriptionValidator } from './subscription.validator';
import { SubscriptionEventType } from '../subscription.event_types';

export class Subscription {
    constructor(
        public id: string,
        public github_source_id: string,
        public event_type: SubscriptionEventType,
        public connection_id: string,
        public message_template: string,
        public config: Record<string, unknown>,
        public last_seen: Record<string, unknown>,
        public is_active: boolean,
        public created_at: Date,
        public updated_at: Date,
    ) {}

    static createForDatabase(
        githubSourceId: string,
        eventType: SubscriptionEventType,
        connectionId: string,
        messageTemplate: string,
        config: Record<string, unknown>,
    ): {
        github_source_id: string;
        event_type: SubscriptionEventType;
        connection_id: string;
        message_template: string;
        config: Record<string, unknown>;
    } {
        SubscriptionValidator.validateMessageTemplate(messageTemplate);
        return {
            github_source_id: githubSourceId,
            event_type: eventType,
            connection_id: connectionId,
            message_template: messageTemplate,
            config,
        };
    }

    static restore(
        id: string,
        github_source_id: string,
        event_type: SubscriptionEventType,
        connection_id: string,
        message_template: string,
        config: Record<string, unknown>,
        last_seen: Record<string, unknown>,
        is_active: boolean,
        created_at: Date,
        updated_at: Date,
    ): Subscription {
        SubscriptionValidator.validateMessageTemplate(message_template);
        return new Subscription(
            id, github_source_id, event_type, connection_id, message_template,
            config, last_seen, is_active, created_at, updated_at,
        );
    }
}
