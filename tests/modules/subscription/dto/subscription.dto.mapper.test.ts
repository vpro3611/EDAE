import { SubscriptionDtoMapper } from '../../../../src/modules/subscription/dto/subscription.dto.mapper';
import { Subscription } from '../../../../src/modules/subscription/entity/subscription';
import { SubscriptionEventType } from '../../../../src/modules/subscription/subscription.event_types';

const NOW = new Date('2024-01-01T00:00:00.000Z');
const LATER = new Date('2024-06-01T00:00:00.000Z');
const EVENT_TYPE: SubscriptionEventType = 'pr_opened';

function makeSub(overrides: Partial<{
    id: string;
    github_source_id: string;
    event_type: SubscriptionEventType;
    connection_id: string;
    message_template: string;
    config: Record<string, unknown>;
    last_seen: Record<string, unknown>;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}> = {}): Subscription {
    return Subscription.restore(
        overrides.id ?? 'sub-1',
        overrides.github_source_id ?? 'src-1',
        overrides.event_type ?? EVENT_TYPE,
        overrides.connection_id ?? 'conn-1',
        overrides.message_template ?? 'Hello {{repo}}',
        overrides.config ?? { threshold: 100 },
        overrides.last_seen ?? { sha: 'abc123' },
        overrides.is_active !== undefined ? overrides.is_active : true,
        overrides.created_at ?? NOW,
        overrides.updated_at ?? LATER,
    );
}

describe('SubscriptionDtoMapper', () => {
    let mapper: SubscriptionDtoMapper;

    beforeEach(() => {
        mapper = SubscriptionDtoMapper.create();
    });

    it('maps all fields correctly', () => {
        const sub = makeSub();
        const dto = mapper.mapToDto(sub);

        expect(dto.id).toBe('sub-1');
        expect(dto.github_source_id).toBe('src-1');
        expect(dto.event_type).toBe(EVENT_TYPE);
        expect(dto.connection_id).toBe('conn-1');
        expect(dto.message_template).toBe('Hello {{repo}}');
        expect(dto.config).toEqual({ threshold: 100 });
        expect(dto.is_active).toBe(true);
        expect(dto.created_at).toBe(NOW.toISOString());
        expect(dto.updated_at).toBe(LATER.toISOString());
    });

    it('maps is_active false correctly', () => {
        const sub = makeSub({ is_active: false });
        const dto = mapper.mapToDto(sub);
        expect(dto.is_active).toBe(false);
    });

    it('maps is_active true correctly', () => {
        const sub = makeSub({ is_active: true });
        const dto = mapper.mapToDto(sub);
        expect(dto.is_active).toBe(true);
    });

    it('returns ISO date strings for created_at and updated_at', () => {
        const createdAt = new Date('2023-03-15T12:30:00.000Z');
        const updatedAt = new Date('2023-09-20T08:00:00.000Z');
        const sub = makeSub({ created_at: createdAt, updated_at: updatedAt });
        const dto = mapper.mapToDto(sub);

        expect(dto.created_at).toBe('2023-03-15T12:30:00.000Z');
        expect(dto.updated_at).toBe('2023-09-20T08:00:00.000Z');
        expect(typeof dto.created_at).toBe('string');
        expect(typeof dto.updated_at).toBe('string');
    });

    it('maps different event types correctly', () => {
        const sub = makeSub({ event_type: 'workflow_completed' });
        const dto = mapper.mapToDto(sub);
        expect(dto.event_type).toBe('workflow_completed');
    });

    it('maps empty config object', () => {
        const sub = makeSub({ config: {} });
        const dto = mapper.mapToDto(sub);
        expect(dto.config).toEqual({});
    });

    it('does not include last_seen in the DTO', () => {
        const sub = makeSub({ last_seen: { sha: 'def456' } });
        const dto = mapper.mapToDto(sub);
        expect(dto).not.toHaveProperty('last_seen');
    });
});
