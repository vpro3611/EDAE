export interface InfraEmailSenderInterface {
    sendRegistrationOtp(to: string, otp: string): Promise<void>;
    sendPasswordResetOtp(to: string, otp: string): Promise<void>;
    sendEmailChangeOtp(to: string, otp: string): Promise<void>;
    sendAccountDeletionOtp(to: string, otp: string): Promise<void>;
}
