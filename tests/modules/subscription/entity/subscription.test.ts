import { Subscription } from '../../../../src/modules/subscription/entity/subscription';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { SubscriptionEventType } from '../../../../src/modules/subscription/subscription.event_types';

const NOW = new Date('2024-01-01T00:00:00.000Z');
const LATER = new Date('2024-06-01T00:00:00.000Z');
const EVENT_TYPE: SubscriptionEventType = 'new_release';

function makeRestoreArgs(): Parameters<typeof Subscription.restore> {
    return [
        'sub-1',
        'src-1',
        EVENT_TYPE,
        'conn-1',
        'Hello {{repo}}',
        { key: 'value' },
        { sha: 'abc' },
        true,
        NOW,
        LATER,
    ];
}

describe('Subscription.createForDatabase', () => {
    it('returns plain data object on happy path', () => {
        const data = Subscription.createForDatabase(
            'src-1', EVENT_TYPE, 'conn-1', 'Hello {{repo}}', { key: 'val' },
        );
        expect(data).toEqual({
            github_source_id: 'src-1',
            event_type: EVENT_TYPE,
            connection_id: 'conn-1',
            message_template: 'Hello {{repo}}',
            config: { key: 'val' },
        });
    });

    it('returns correct data with empty config object', () => {
        const data = Subscription.createForDatabase('src-1', 'pr_merged', 'conn-2', 'PR merged!', {});
        expect(data.config).toEqual({});
        expect(data.event_type).toBe('pr_merged');
    });

    it('throws 400 when messageTemplate is empty string', () => {
        expect(() =>
            Subscription.createForDatabase('src-1', EVENT_TYPE, 'conn-1', '', {}),
        ).toThrow(AppError);

        try {
            Subscription.createForDatabase('src-1', EVENT_TYPE, 'conn-1', '', {});
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(400);
            expect(e.message).toBe('Message template cannot be empty.');
        }
    });

    it('throws 400 when messageTemplate is whitespace only', () => {
        expect(() =>
            Subscription.createForDatabase('src-1', EVENT_TYPE, 'conn-1', '   ', {}),
        ).toThrow(AppError);

        try {
            Subscription.createForDatabase('src-1', EVENT_TYPE, 'conn-1', '   ', {});
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(400);
        }
    });

    it('throws 400 when messageTemplate is null', () => {
        expect(() =>
            Subscription.createForDatabase('src-1', EVENT_TYPE, 'conn-1', null as unknown as string, {}),
        ).toThrow(AppError);
    });
});

describe('Subscription.restore', () => {
    it('returns a Subscription instance with all fields correctly set', () => {
        const sub = Subscription.restore(...makeRestoreArgs());
        expect(sub).toBeInstanceOf(Subscription);
        expect(sub.id).toBe('sub-1');
        expect(sub.github_source_id).toBe('src-1');
        expect(sub.event_type).toBe(EVENT_TYPE);
        expect(sub.connection_id).toBe('conn-1');
        expect(sub.message_template).toBe('Hello {{repo}}');
        expect(sub.config).toEqual({ key: 'value' });
        expect(sub.last_seen).toEqual({ sha: 'abc' });
        expect(sub.is_active).toBe(true);
        expect(sub.created_at).toBe(NOW);
        expect(sub.updated_at).toBe(LATER);
    });

    it('restores with is_active false', () => {
        const args = makeRestoreArgs();
        args[7] = false; // is_active
        const sub = Subscription.restore(...args);
        expect(sub.is_active).toBe(false);
    });

    it('restores with null last_seen', () => {
        const args = makeRestoreArgs();
        args[6] = null as unknown as Record<string, unknown>;
        const sub = Subscription.restore(...args);
        expect(sub.last_seen).toBeNull();
    });

    it('throws 400 when message_template is empty string', () => {
        expect(() => {
            const args = makeRestoreArgs();
            args[4] = ''; // message_template
            Subscription.restore(...args);
        }).toThrow(AppError);

        try {
            const args = makeRestoreArgs();
            args[4] = '';
            Subscription.restore(...args);
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(400);
            expect(e.message).toBe('Message template cannot be empty.');
        }
    });

    it('throws 400 when message_template is whitespace only', () => {
        expect(() => {
            const args = makeRestoreArgs();
            args[4] = '   ';
            Subscription.restore(...args);
        }).toThrow(AppError);
    });
});
