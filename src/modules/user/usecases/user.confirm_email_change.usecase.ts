import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';
import { VerifyOtpUseCase } from '../../token/usecases/token.verify_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class ConfirmEmailChangeUseCase {
    private moduleName = 'ConfirmEmailChangeUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly verifyOtpUseCase: VerifyOtpUseCase,
    ) {}

    static create(
        userRepoReader: UserRepoReaderInterface,
        userRepoWriter: UserRepoWriterInterface,
        verifyOtpUseCase: VerifyOtpUseCase,
    ): ConfirmEmailChangeUseCase {
        return new ConfirmEmailChangeUseCase(userRepoReader, userRepoWriter, verifyOtpUseCase);
    }

    async execute(userId: string, otp: string): Promise<void> {
        const user = await this.userRepoReader.getUserById(userId);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }
        if (user.pending_email === null) {
            throwAppError('No pending email change.', 400, `${this.moduleName}.execute()`);
        }

        await this.verifyOtpUseCase.execute(userId, TokenPurpose.CHANGE_EMAIL, otp);

        const pendingEmail = user.pending_email;
        user.updateEmail(pendingEmail);
        user.updatePendingEmail(null);
        await this.userRepoWriter.updateUser(user);
    }
}
