import { Subscription } from '../entity/subscription';
import { SubscriptionDto } from './subscription.dto';

export class SubscriptionDtoMapper {
    static create(): SubscriptionDtoMapper {
        return new SubscriptionDtoMapper();
    }

    mapToDto(sub: Subscription): SubscriptionDto {
        return {
            id: sub.id,
            github_source_id: sub.github_source_id,
            event_type: sub.event_type,
            connection_id: sub.connection_id,
            message_template: sub.message_template,
            config: sub.config,
            is_active: sub.is_active,
            created_at: sub.created_at.toISOString(),
            updated_at: sub.updated_at.toISOString(),
        };
    }
}
