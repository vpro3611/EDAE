import { throwAppError } from '../../errors/errors.global';
import { ConnectionCredentials } from '../connection.credentials';

export class ConnectionValidator {
    private static moduleName = 'ConnectionValidator';
    private static MinNameLength = 1;
    private static MaxNameLength = 100;
    private static urlPattern = /^https?:\/\/.+/;
    private static emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    static validateName(name: string): void {
        const trimmed = name.trim();
        if (trimmed.length < this.MinNameLength || trimmed.length > this.MaxNameLength) {
            throwAppError(
                `Name must be between ${this.MinNameLength} and ${this.MaxNameLength} characters.`,
                400,
                `${this.moduleName}.validateName`,
            );
        }
    }

    static validateCredentials(creds: ConnectionCredentials): void {
        switch (creds.provider) {
            case 'telegram':
                if (!creds.bot_token?.trim()) {
                    throwAppError('bot_token is required.', 400, `${this.moduleName}.validateCredentials`);
                }
                if (!creds.chat_id?.trim()) {
                    throwAppError('chat_id is required.', 400, `${this.moduleName}.validateCredentials`);
                }
                break;
            case 'slack':
                if (!this.urlPattern.test(creds.webhook_url)) {
                    throwAppError('webhook_url must be a valid URL.', 400, `${this.moduleName}.validateCredentials`);
                }
                break;
            case 'email':
                if (!this.emailPattern.test(creds.address)) {
                    throwAppError('address must be a valid email address.', 400, `${this.moduleName}.validateCredentials`);
                }
                break;
            default:
                throwAppError('Unknown provider.', 400, `${this.moduleName}.validateCredentials`);
        }
    }
}
