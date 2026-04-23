import { UserRepoReaderInterface } from '../interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';
import { CreateOtpUseCase } from '../../token/usecases/token.create_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class RequestAccountDeletionUseCase {
    private moduleName = 'RequestAccountDeletionUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly createOtpUseCase: CreateOtpUseCase,
    ) {}

    static create(userRepoReader: UserRepoReaderInterface, createOtpUseCase: CreateOtpUseCase): RequestAccountDeletionUseCase {
        return new RequestAccountDeletionUseCase(userRepoReader, createOtpUseCase);
    }

    async execute(userId: string): Promise<void> {
        const user = await this.userRepoReader.getUserById(userId);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
            return;
        }
        user.assertDelete();
        await this.createOtpUseCase.execute(userId, user.email, TokenPurpose.DELETE_ACCOUNT);
    }
}
