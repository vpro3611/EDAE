import { UserRepoReaderInterface } from '../interfaces/interface.repository';
import { UserValidator } from '../entity/user.validator';
import { throwAppError } from '../../errors/errors.global';
import { CreateOtpUseCase } from '../../token/usecases/token.create_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class RequestPasswordResetUseCase {
    private moduleName = 'RequestPasswordResetUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly createOtpUseCase: CreateOtpUseCase,
    ) {}

    static create(userRepoReader: UserRepoReaderInterface, createOtpUseCase: CreateOtpUseCase): RequestPasswordResetUseCase {
        return new RequestPasswordResetUseCase(userRepoReader, createOtpUseCase);
    }

    async execute(email: string): Promise<void> {
        UserValidator.validateEmail(email);

        const user = await this.userRepoReader.getUserByEmail(email);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
            return;
        }

        await this.createOtpUseCase.execute(user.id, email, TokenPurpose.RESET_PASSWORD);
    }
}
