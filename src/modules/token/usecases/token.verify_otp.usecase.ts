import { OtpToken, TokenPurpose } from '../entity/token';
import { TokenRepoReaderInterface, TokenRepoWriterInterface } from '../interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';

export class VerifyOtpUseCase {
    private moduleName = 'VerifyOtpUseCase';

    constructor(
        private readonly tokenRepoReader: TokenRepoReaderInterface,
        private readonly tokenRepoWriter: TokenRepoWriterInterface,
    ) {}

    static create(tokenRepoReader: TokenRepoReaderInterface, tokenRepoWriter: TokenRepoWriterInterface): VerifyOtpUseCase {
        return new VerifyOtpUseCase(tokenRepoReader, tokenRepoWriter);
    }

    async execute(userId: string, purpose: TokenPurpose, plainOtp: string): Promise<void> {
        const token = await this.tokenRepoReader.getActiveToken(userId, purpose);

        if (!token) {
            throwAppError('No active verification code found.', 400, `${this.moduleName}.execute()`);
        }

        token.assertValid();

        if (OtpToken.hash(plainOtp) !== token.otp_hash) {
            throwAppError('Invalid or expired verification code.', 400, `${this.moduleName}.execute()`);
        }

        await this.tokenRepoWriter.markTokenAsUsed(token.id);
    }
}
