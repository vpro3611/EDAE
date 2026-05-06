import { ReportConfig } from '../../../../src/modules/report/entity/report_config';
import { AppError } from '../../../../src/modules/errors/errors.global';

function makeConfig(overrides: Partial<{
    id: string; user_id: string; connection_id: string;
    frequency: any; schedule_day: number; is_active: boolean;
    last_sent_at: Date | null;
}> = {}): ReportConfig {
    return ReportConfig.restore(
        overrides.id ?? 'cfg-id',
        overrides.user_id ?? 'user-id',
        overrides.connection_id ?? 'conn-id',
        overrides.frequency ?? 'weekly',
        overrides.schedule_day ?? 3,
        overrides.is_active ?? true,
        overrides.last_sent_at !== undefined ? overrides.last_sent_at : null,
        new Date('2026-01-01'),
        new Date('2026-01-01'),
    );
}

describe('ReportConfig entity', () => {
    describe('createForDatabase', () => {
        it('returns insert-ready object', () => {
            const data = ReportConfig.createForDatabase('uid', 'cid', 'weekly', 3);
            expect(data).toEqual({ user_id: 'uid', connection_id: 'cid', frequency: 'weekly', schedule_day: 3 });
        });
        it('throws 400 on invalid frequency', () => {
            expect(() => ReportConfig.createForDatabase('uid', 'cid', 'hourly' as any, 0)).toThrow(AppError);
        });
        it('throws 400 when schedule_day is out of range', () => {
            expect(() => ReportConfig.createForDatabase('uid', 'cid', 'weekly', 7)).toThrow(AppError);
        });
    });

    describe('ensureOwnership', () => {
        it('does not throw when actor matches', () => {
            expect(() => makeConfig({ user_id: 'actor' }).ensureOwnership('actor', 'op')).not.toThrow();
        });
        it('throws 403 when actor does not match', () => {
            expect(() => makeConfig({ user_id: 'owner' }).ensureOwnership('other', 'op')).toThrow(AppError);
        });
    });

    describe('ensureActive', () => {
        it('does not throw when config is active', () => {
            expect(() => makeConfig({ is_active: true }).ensureActive('op')).not.toThrow();
        });
        it('throws 400 when config is inactive', () => {
            expect(() => makeConfig({ is_active: false }).ensureActive('op')).toThrow(AppError);
        });
    });

    describe('isDue', () => {
        const NOW = new Date('2026-05-06T10:00:00Z'); // Wednesday, getDay() === 3

        it('returns true when last_sent_at is null', () => {
            expect(makeConfig({ last_sent_at: null }).isDue(NOW)).toBe(true);
        });
        it('returns true for daily config not sent in 25h', () => {
            const cfg = makeConfig({ frequency: 'daily', last_sent_at: new Date(NOW.getTime() - 25 * 3600 * 1000) });
            expect(cfg.isDue(NOW)).toBe(true);
        });
        it('returns false for daily config sent 23h ago', () => {
            const cfg = makeConfig({ frequency: 'daily', last_sent_at: new Date(NOW.getTime() - 23 * 3600 * 1000) });
            expect(cfg.isDue(NOW)).toBe(false);
        });
        it('returns true for weekly config sent 8 days ago on correct weekday', () => {
            const cfg = makeConfig({ frequency: 'weekly', schedule_day: 3, last_sent_at: new Date(NOW.getTime() - 8 * 86400 * 1000) });
            expect(cfg.isDue(NOW)).toBe(true);
        });
        it('returns false for weekly config on wrong weekday', () => {
            const MONDAY = new Date('2026-05-04T10:00:00Z');
            const cfg = makeConfig({ frequency: 'weekly', schedule_day: 3, last_sent_at: new Date(MONDAY.getTime() - 8 * 86400 * 1000) });
            expect(cfg.isDue(MONDAY)).toBe(false);
        });
        it('returns true for monthly config sent 31 days ago', () => {
            const cfg = makeConfig({ frequency: 'monthly', last_sent_at: new Date(NOW.getTime() - 31 * 86400 * 1000) });
            expect(cfg.isDue(NOW)).toBe(true);
        });
    });
});
