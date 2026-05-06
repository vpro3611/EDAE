export interface InfraEmailSenderInterface {
    sendRegistrationOtp(to: string, otp: string): Promise<void>;
    sendPasswordResetOtp(to: string, otp: string): Promise<void>;
    sendEmailChangeOtp(to: string, otp: string): Promise<void>;
    sendAccountDeletionOtp(to: string, otp: string): Promise<void>;
    sendNotification(to: string, subject: string, body: string): Promise<void>;
    sendNotificationWithAttachment(to: string, subject: string, body: string, attachment: Buffer, filename: string): Promise<void>;
}
