import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interface.repository';
import { UserValidator } from '../entity/user.validator';
import { throwAppError } from '../../errors/errors.global';
import { InfraPasswordHasherInterface } from '../../infra/password/infra.password_hasher.interface';
import { VerifyOtpUseCase } from '../../token/usecases/token.verify_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class ConfirmPasswordResetUseCase {
    private moduleName = 'ConfirmPasswordResetUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly passwordHasher: InfraPasswordHasherInterface,
        private readonly verifyOtpUseCase: VerifyOtpUseCase,
    ) {}

    static create(
        userRepoReader: UserRepoReaderInterface,
        userRepoWriter: UserRepoWriterInterface,
        passwordHasher: InfraPasswordHasherInterface,
        verifyOtpUseCase: VerifyOtpUseCase,
    ): ConfirmPasswordResetUseCase {
        return new ConfirmPasswordResetUseCase(userRepoReader, userRepoWriter, passwordHasher, verifyOtpUseCase);
    }

    async execute(email: string, otp: string, newPassword: string): Promise<void> {
        UserValidator.validateEmail(email);
        UserValidator.validatePassword(newPassword);

        const user = await this.userRepoReader.getUserByEmail(email);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }

        await this.verifyOtpUseCase.execute(user.id, TokenPurpose.RESET_PASSWORD, otp);

        const newPasswordHashed = await this.passwordHasher.hash(newPassword);
        user.resetPassword(newPasswordHashed);

        await this.userRepoWriter.updateUser(user);
    }
}
