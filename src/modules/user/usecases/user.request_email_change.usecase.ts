import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interface.repository';
import { UserValidator } from '../entity/user.validator';
import { throwAppError } from '../../errors/errors.global';
import { CreateOtpUseCase } from '../../token/usecases/token.create_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class RequestEmailChangeUseCase {
    private moduleName = 'RequestEmailChangeUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly createOtpUseCase: CreateOtpUseCase,
    ) {}

    static create(
        userRepoReader: UserRepoReaderInterface,
        userRepoWriter: UserRepoWriterInterface,
        createOtpUseCase: CreateOtpUseCase,
    ): RequestEmailChangeUseCase {
        return new RequestEmailChangeUseCase(userRepoReader, userRepoWriter, createOtpUseCase);
    }

    async execute(userId: string, newEmail: string): Promise<void> {
        UserValidator.validateEmail(newEmail);

        const user = await this.userRepoReader.getUserById(userId);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }

        user.updatePendingEmail(newEmail);
        await this.userRepoWriter.updateUser(user);
        await this.createOtpUseCase.execute(userId, newEmail, TokenPurpose.CHANGE_EMAIL);
    }
}
