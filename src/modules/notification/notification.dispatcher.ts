import {
    ConnectionCredentials,
    TelegramCredentials,
    SlackCredentials,
    EmailCredentials,
} from '../connection/connection.credentials';
import { InfraEmailSenderInterface } from '../infra/email/infra.email_sender.interface';

export class NotificationDispatcher {
    constructor(private readonly emailSender: InfraEmailSenderInterface) {}

    static create(emailSender: InfraEmailSenderInterface): NotificationDispatcher {
        return new NotificationDispatcher(emailSender);
    }

    async dispatch(credentials: ConnectionCredentials, message: string): Promise<void> {
        switch (credentials.provider) {
            case 'telegram':
                await this.sendTelegram(credentials, message);
                break;
            case 'slack':
                await this.sendSlack(credentials, message);
                break;
            case 'email':
                await this.sendEmail(credentials, message);
                break;
            default: {
                const _exhaustive: never = credentials;
                throw new Error(`Unhandled provider: ${(_exhaustive as any).provider}`);
            }
        }
    }

    private async sendTelegram(creds: TelegramCredentials, message: string): Promise<void> {
        const url = `https://api.telegram.org/bot${creds.bot_token}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: creds.chat_id, text: message }),
        });
        if (!res.ok) {
            throw new Error(`Telegram dispatch failed: ${res.status}`);
        }
    }

    private async sendSlack(creds: SlackCredentials, message: string): Promise<void> {
        const res = await fetch(creds.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message }),
        });
        if (!res.ok) {
            throw new Error(`Slack dispatch failed: ${res.status}`);
        }
    }

    private async sendEmail(creds: EmailCredentials, message: string): Promise<void> {
        await this.emailSender.sendNotification(creds.address, 'EDAE Notification', message);
    }
}
