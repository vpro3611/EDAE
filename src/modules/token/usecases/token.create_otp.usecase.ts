import { OtpToken, TokenPurpose } from '../entity/token';
import { TokenRepoWriterInterface } from '../interfaces/interface.repository';
import { InfraEmailSenderInterface } from '../../infra/email/infra.email_sender.interface';

export class CreateOtpUseCase {
    private moduleName = 'CreateOtpUseCase';

    constructor(
        private readonly tokenRepoWriter: TokenRepoWriterInterface,
        private readonly emailSender: InfraEmailSenderInterface,
    ) {}

    static create(tokenRepoWriter: TokenRepoWriterInterface, emailSender: InfraEmailSenderInterface): CreateOtpUseCase {
        return new CreateOtpUseCase(tokenRepoWriter, emailSender);
    }

    private async sendEmail(purpose: TokenPurpose, to: string, otp: string): Promise<void> {
        switch (purpose) {
            case TokenPurpose.REGISTRATION:
                return this.emailSender.sendRegistrationOtp(to, otp);
            case TokenPurpose.RESET_PASSWORD:
                return this.emailSender.sendPasswordResetOtp(to, otp);
            case TokenPurpose.CHANGE_EMAIL:
                return this.emailSender.sendEmailChangeOtp(to, otp);
            case TokenPurpose.DELETE_ACCOUNT:
                return this.emailSender.sendAccountDeletionOtp(to, otp);
        }
    }

    async execute(userId: string, recipientEmail: string, purpose: TokenPurpose): Promise<void> {
        await this.tokenRepoWriter.invalidatePreviousTokens(userId, purpose);

        const plain = OtpToken.generate();
        const otpHash = OtpToken.hash(plain);
        const tokenData = OtpToken.createForDatabase(userId, purpose, otpHash, 15);

        await this.tokenRepoWriter.createToken(tokenData);
        await this.sendEmail(purpose, recipientEmail, plain);
    }
}
