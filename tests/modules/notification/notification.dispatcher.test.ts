import { NotificationDispatcher } from '../../../src/modules/notification/notification.dispatcher';
import { InfraEmailSenderInterface } from '../../../src/modules/infra/email/infra.email_sender.interface';
import { ConnectionCredentials } from '../../../src/modules/connection/connection.credentials';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NotificationDispatcher.dispatchFile', () => {
    let emailSender: jest.Mocked<InfraEmailSenderInterface>;
    let dispatcher: NotificationDispatcher;
    const PDF = Buffer.from('%PDF-mock');

    beforeEach(() => {
        mockFetch.mockReset();
        emailSender = {
            sendRegistrationOtp: jest.fn(),
            sendPasswordResetOtp: jest.fn(),
            sendEmailChangeOtp: jest.fn(),
            sendAccountDeletionOtp: jest.fn(),
            sendNotification: jest.fn(),
            sendNotificationWithAttachment: jest.fn(),
        };
        dispatcher = NotificationDispatcher.create(emailSender);
    });

    it('sends email attachment', async () => {
        const creds: ConnectionCredentials = { provider: 'email', address: 'user@test.com' };
        await dispatcher.dispatchFile(creds, PDF, 'report.pdf', 'Weekly report');
        expect(emailSender.sendNotificationWithAttachment).toHaveBeenCalledWith(
            'user@test.com', 'EDAE Report', 'Weekly report', PDF, 'report.pdf',
        );
    });

    it('sends telegram document', async () => {
        mockFetch.mockResolvedValue({ ok: true });
        const creds: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: '123' };
        await dispatcher.dispatchFile(creds, PDF, 'report.pdf', 'caption');
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/sendDocument'),
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('throws when Slack has no bot_token for file dispatch', async () => {
        const creds: ConnectionCredentials = { provider: 'slack', webhook_url: 'https://hooks.slack.com/x' };
        await expect(dispatcher.dispatchFile(creds, PDF, 'report.pdf', 'caption')).rejects.toThrow(
            'Slack Bot Token not configured',
        );
    });

    it('sends slack file via files.uploadV2 flow with caption as initial_comment', async () => {
        mockFetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, upload_url: 'https://upload.slack.com/x', file_id: 'F1' }) })
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
        const creds: ConnectionCredentials = { provider: 'slack', bot_token: 'xoxb-tok', channel_id: 'C123' };
        await dispatcher.dispatchFile(creds, PDF, 'report.pdf', 'My caption');
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://slack.com/api/files.getUploadURLExternal', expect.anything());
        const completeCall = mockFetch.mock.calls[2];
        expect(completeCall[0]).toBe('https://slack.com/api/files.completeUploadExternal');
        const completeBody = JSON.parse(completeCall[1].body);
        expect(completeBody.initial_comment).toBe('My caption');
    });

    it('throws on Slack getUploadURLExternal HTTP failure', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
        const creds: ConnectionCredentials = { provider: 'slack', bot_token: 'xoxb-tok', channel_id: 'C123' };
        await expect(dispatcher.dispatchFile(creds, PDF, 'report.pdf', 'cap')).rejects.toThrow('getUploadURLExternal failed');
    });
});

describe('NotificationDispatcher.dispatch (text)', () => {
    let emailSender: jest.Mocked<InfraEmailSenderInterface>;
    let dispatcher: NotificationDispatcher;

    beforeEach(() => {
        (global.fetch as jest.Mock).mockReset();
        emailSender = {
            sendRegistrationOtp: jest.fn(), sendPasswordResetOtp: jest.fn(),
            sendEmailChangeOtp: jest.fn(), sendAccountDeletionOtp: jest.fn(),
            sendNotification: jest.fn(), sendNotificationWithAttachment: jest.fn(),
        };
        dispatcher = NotificationDispatcher.create(emailSender);
    });

    it('sends slack text via chat.postMessage when bot_token+channel_id configured', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
        const creds: ConnectionCredentials = { provider: 'slack', bot_token: 'xoxb-tok', channel_id: 'C123' };
        await dispatcher.dispatch(creds, 'hello');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://slack.com/api/chat.postMessage',
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('sends slack text via webhook when webhook_url configured', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
        const creds: ConnectionCredentials = { provider: 'slack', webhook_url: 'https://hooks.slack.com/x' };
        await dispatcher.dispatch(creds, 'hello');
        expect(global.fetch).toHaveBeenCalledWith('https://hooks.slack.com/x', expect.anything());
    });
});
