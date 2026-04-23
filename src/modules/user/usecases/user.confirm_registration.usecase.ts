import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';
import { VerifyOtpUseCase } from '../../token/usecases/token.verify_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class ConfirmRegistrationUseCase {
    private moduleName = 'ConfirmRegistrationUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly verifyOtpUseCase: VerifyOtpUseCase,
    ) {}

    static create(userRepoReader: UserRepoReaderInterface, userRepoWriter: UserRepoWriterInterface, verifyOtpUseCase: VerifyOtpUseCase): ConfirmRegistrationUseCase {
        return new ConfirmRegistrationUseCase(userRepoReader, userRepoWriter, verifyOtpUseCase);
    }

    async execute(email: string, otp: string): Promise<void> {
        const user = await this.userRepoReader.getUserByEmail(email);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }
        if (user.is_verified) {
            throwAppError('User is already verified.', 400, `${this.moduleName}.execute()`);
        }
        await this.verifyOtpUseCase.execute(user.id, TokenPurpose.REGISTRATION, otp);
        await this.userRepoWriter.markUserAsVerified(user.id);
    }
}
