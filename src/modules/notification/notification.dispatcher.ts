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

    async dispatchFile(credentials: ConnectionCredentials, buffer: Buffer, filename: string, caption: string): Promise<void> {
        switch (credentials.provider) {
            case 'telegram':
                await this.sendTelegramFile(credentials, buffer, filename, caption);
                break;
            case 'slack':
                await this.sendSlackFile(credentials, buffer, filename, caption);
                break;
            case 'email':
                await this.emailSender.sendNotificationWithAttachment(credentials.address, 'EDAE Report', caption, buffer, filename);
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

    private async sendTelegramFile(creds: TelegramCredentials, buffer: Buffer, filename: string, caption: string): Promise<void> {
        const url = `https://api.telegram.org/bot${creds.bot_token}/sendDocument`;
        const form = new FormData();
        form.append('chat_id', creds.chat_id);
        form.append('caption', caption);
        const arrayBuf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
        form.append('document', new Blob([arrayBuf], { type: 'application/pdf' }), filename);
        const res = await fetch(url, { method: 'POST', body: form });
        if (!res.ok) {
            throw new Error(`Telegram file dispatch failed: ${res.status}`);
        }
    }

    private async sendSlack(creds: SlackCredentials, message: string): Promise<void> {
        if (creds.webhook_url) {
            const res = await fetch(creds.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message }),
            });
            if (!res.ok) throw new Error(`Slack dispatch failed: ${res.status}`);
        } else if (creds.bot_token && creds.channel_id) {
            const res = await fetch('https://slack.com/api/chat.postMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${creds.bot_token}` },
                body: JSON.stringify({ channel: creds.channel_id, text: message }),
            });
            if (!res.ok) throw new Error(`Slack chat.postMessage failed: ${res.status}`);
        } else {
            throw new Error('Slack credentials not configured for text dispatch.');
        }
    }

    private async sendSlackFile(creds: SlackCredentials, buffer: Buffer, filename: string, caption: string): Promise<void> {
        if (!creds.bot_token || !creds.channel_id) {
            throw new Error('Slack Bot Token not configured for file dispatch');
        }

        // 3-step Slack files.uploadV2 flow: https://api.slack.com/methods/files.uploadV2
        const urlRes = await fetch('https://slack.com/api/files.getUploadURLExternal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${creds.bot_token}` },
            body: JSON.stringify({ filename, length: buffer.length }),
        });
        if (!urlRes.ok) throw new Error(`Slack getUploadURLExternal failed: ${urlRes.status}`);
        const urlData = await urlRes.json() as { ok: boolean; upload_url: string; file_id: string };
        if (!urlData.ok) throw new Error(`Slack getUploadURLExternal error: ${JSON.stringify(urlData)}`);

        const uploadRes = await fetch(urlData.upload_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
        });
        if (!uploadRes.ok) throw new Error(`Slack file upload failed: ${uploadRes.status}`);

        const completeRes = await fetch('https://slack.com/api/files.completeUploadExternal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${creds.bot_token}` },
            body: JSON.stringify({ files: [{ id: urlData.file_id }], channel_id: creds.channel_id, initial_comment: caption }),
        });
        if (!completeRes.ok) throw new Error(`Slack completeUploadExternal failed: ${completeRes.status}`);
    }

    private async sendEmail(creds: EmailCredentials, message: string): Promise<void> {
        await this.emailSender.sendNotification(creds.address, 'EDAE Notification', message);
    }
}
