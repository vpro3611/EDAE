import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';
import { VerifyOtpUseCase } from '../../token/usecases/token.verify_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class ConfirmAccountDeletionUseCase {
    private moduleName = 'ConfirmAccountDeletionUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly verifyOtpUseCase: VerifyOtpUseCase,
    ) {}

    static create(
        userRepoReader: UserRepoReaderInterface,
        userRepoWriter: UserRepoWriterInterface,
        verifyOtpUseCase: VerifyOtpUseCase,
    ): ConfirmAccountDeletionUseCase {
        return new ConfirmAccountDeletionUseCase(userRepoReader, userRepoWriter, verifyOtpUseCase);
    }

    async execute(userId: string, otp: string): Promise<void> {
        const user = await this.userRepoReader.getUserById(userId);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }
        user.assertDelete();
        await this.verifyOtpUseCase.execute(userId, TokenPurpose.DELETE_ACCOUNT, otp);
        await this.userRepoWriter.deleteUser(userId);
    }
}
