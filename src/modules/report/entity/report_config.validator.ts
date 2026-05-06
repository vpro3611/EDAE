import { throwAppError } from '../../errors/errors.global';
import { ReportFrequency } from './report_config';

export class ReportConfigValidator {
    private static moduleName = 'ReportConfigValidator';
    private static validFrequencies: ReportFrequency[] = ['daily', 'weekly', 'monthly'];

    static validateFrequency(frequency: string): void {
        if (!this.validFrequencies.includes(frequency as ReportFrequency)) {
            throwAppError(
                `Frequency must be one of: ${this.validFrequencies.join(', ')}.`,
                400,
                `${this.moduleName}.validateFrequency`,
            );
        }
    }

    static validateScheduleDay(scheduleDay: number): void {
        if (!Number.isInteger(scheduleDay) || scheduleDay < 0 || scheduleDay > 6) {
            throwAppError(
                'schedule_day must be an integer between 0 and 6.',
                400,
                `${this.moduleName}.validateScheduleDay`,
            );
        }
    }
}
