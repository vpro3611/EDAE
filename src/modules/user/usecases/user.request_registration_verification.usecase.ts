import { UserRepoReaderInterface } from '../interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';
import { CreateOtpUseCase } from '../../token/usecases/token.create_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class RequestRegistrationVerificationUseCase {
    private moduleName = 'RequestRegistrationVerificationUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly createOtpUseCase: CreateOtpUseCase,
    ) {}

    static create(userRepoReader: UserRepoReaderInterface, createOtpUseCase: CreateOtpUseCase): RequestRegistrationVerificationUseCase {
        return new RequestRegistrationVerificationUseCase(userRepoReader, createOtpUseCase);
    }

    async execute(userId: string): Promise<void> {
        const user = await this.userRepoReader.getUserById(userId);

        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }

        if (user.is_verified) {
            throwAppError('User is already verified.', 400, `${this.moduleName}.execute()`);
        }

        await this.createOtpUseCase.execute(userId, user.email, TokenPurpose.REGISTRATION);
    }
}
