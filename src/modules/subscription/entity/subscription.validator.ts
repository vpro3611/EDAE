import { throwAppError } from '../../errors/errors.global';

export class SubscriptionValidator {
    private static moduleName = 'SubscriptionValidator';

    static validateMessageTemplate(template: string): void {
        const trimmed = template?.trim() ?? '';
        if (trimmed.length === 0) {
            throwAppError('Message template cannot be empty.', 400, `${SubscriptionValidator.moduleName}.validateMessageTemplate`);
        }
    }
}
