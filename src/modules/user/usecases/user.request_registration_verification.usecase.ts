import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interface.repository';
import { UserValidator } from '../entity/user.validator';
import { throwAppError } from '../../errors/errors.global';
import { InfraPasswordHasherInterface } from '../../infra/password/infra.password_hasher.interface';
import { CreateOtpUseCase } from '../../token/usecases/token.create_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';

export class RequestRegistrationVerificationUseCase {
    private moduleName = 'RequestRegistrationVerificationUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly passwordHasher: InfraPasswordHasherInterface,
        private readonly createOtpUseCase: CreateOtpUseCase,
    ) {}

    static create(
        userRepoReader: UserRepoReaderInterface,
        userRepoWriter: UserRepoWriterInterface,
        passwordHasher: InfraPasswordHasherInterface,
        createOtpUseCase: CreateOtpUseCase,
    ): RequestRegistrationVerificationUseCase {
        return new RequestRegistrationVerificationUseCase(userRepoReader, userRepoWriter, passwordHasher, createOtpUseCase);
    }

    async execute(name: string, email: string, password: string): Promise<void> {
        UserValidator.validationPipeline(name, email, password);

        const existing = await this.userRepoReader.getUserByEmail(email);
        if (existing) {
            throwAppError('User already exists. Use your credentials to log in or reset your password.', 409, `${this.moduleName}.execute()`);
        }

        const passwordHashed = await this.passwordHasher.hash(password);
        await this.userRepoWriter.createUser({ name, email, password_hashed: passwordHashed, last_password: passwordHashed });

        const user = await this.userRepoReader.getUserByEmail(email);
        if (!user) {
            throwAppError('Failed to retrieve user after creation.', 500, `${this.moduleName}.execute()`);
        }

        await this.createOtpUseCase.execute(user.id, email, TokenPurpose.REGISTRATION);
    }
}
