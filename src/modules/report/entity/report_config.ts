import { ReportConfigValidator } from './report_config.validator';
import { throwAppError } from '../../errors/errors.global';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

export class ReportConfig {
    private moduleName = 'ReportConfigDomain';

    constructor(
        public id: string,
        public user_id: string,
        public connection_id: string,
        public frequency: ReportFrequency,
        public schedule_day: number,
        public is_active: boolean,
        public last_sent_at: Date | null,
        public created_at: Date,
        public updated_at: Date,
    ) {}

    static createForDatabase(
        userId: string,
        connectionId: string,
        frequency: ReportFrequency,
        scheduleDay: number,
    ): { user_id: string; connection_id: string; frequency: ReportFrequency; schedule_day: number } {
        ReportConfigValidator.validateFrequency(frequency);
        if (frequency === 'weekly') ReportConfigValidator.validateScheduleDay(scheduleDay);
        return { user_id: userId, connection_id: connectionId, frequency, schedule_day: scheduleDay };
    }

    static restore(
        id: string,
        user_id: string,
        connection_id: string,
        frequency: ReportFrequency,
        schedule_day: number,
        is_active: boolean,
        last_sent_at: Date | null,
        created_at: Date,
        updated_at: Date,
    ): ReportConfig {
        ReportConfigValidator.validateFrequency(frequency);
        if (frequency === 'weekly') ReportConfigValidator.validateScheduleDay(schedule_day);
        return new ReportConfig(id, user_id, connection_id, frequency, schedule_day, is_active, last_sent_at, created_at, updated_at);
    }

    ensureOwnership(actorId: string, op: string): void {
        if (this.user_id !== actorId) {
            throwAppError('Forbidden.', 403, `${this.moduleName}.${op}`);
        }
    }

    ensureActive(op: string): void {
        if (!this.is_active) {
            throwAppError('Report configuration is not active.', 400, `${this.moduleName}.${op}`);
        }
    }

    isDue(now: Date): boolean {
        if (this.last_sent_at === null) {
            return true;
        }

        const elapsedMs = now.getTime() - this.last_sent_at.getTime();

        switch (this.frequency) {
            case 'daily':
                return elapsedMs >= 24 * 3600 * 1000;
            case 'weekly':
                return elapsedMs >= 7 * 86400 * 1000 && now.getDay() === this.schedule_day;
            case 'monthly':
                // 30-day approximation; calendar-month scheduling not required by current spec
                return elapsedMs >= 30 * 86400 * 1000;
        }
    }
}
