import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interface.repository';
import { RequestRegistrationVerificationUseCase } from '../../../../src/modules/user/usecases/user.request_registration_verification.usecase';
import { InfraPasswordHasherInterface } from '../../../../src/modules/infra/password/infra.password_hasher.interface';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';

describe('RequestRegistrationVerificationUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockPasswordHasher: jest.Mocked<InfraPasswordHasherInterface>;
    let mockCreateOtp: { execute: jest.Mock };
    let useCase: RequestRegistrationVerificationUseCase;

    const makeUser = () => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), false, false, 'hashed', null, null
    );

    beforeEach(() => {
        mockUserRepoReader = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        mockUserRepoWriter = {
            createUser: jest.fn().mockResolvedValue(undefined),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            markUserAsVerified: jest.fn(),
        };
        mockPasswordHasher = { hash: jest.fn().mockResolvedValue('hashed'), compare: jest.fn() };
        mockCreateOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new RequestRegistrationVerificationUseCase(
            mockUserRepoReader,
            mockUserRepoWriter,
            mockPasswordHasher,
            mockCreateOtp as any,
        );
    });

    it('should throw for invalid input (bad email)', async () => {
        await expect(useCase.execute('John Doe', 'not-an-email', 'ValidPass123!')).rejects.toThrow(/valid email/);
    });

    it('should throw 409 if email is already taken', async () => {
        mockUserRepoReader.getUserByEmail.mockResolvedValue(makeUser());
        await expect(useCase.execute('John Doe', 'john@example.com', 'ValidPass123!')).rejects.toThrow(/already exists/);
    });

    it('should create user and call CreateOtpUseCase with correct args', async () => {
        mockUserRepoReader.getUserByEmail
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(makeUser());

        await useCase.execute('John Doe', 'john@example.com', 'ValidPass123!');

        expect(mockUserRepoWriter.createUser).toHaveBeenCalledWith({
            name: 'John Doe',
            email: 'john@example.com',
            password_hashed: 'hashed',
            last_password: 'hashed',
        });
        expect(mockCreateOtp.execute).toHaveBeenCalledWith('uuid-1', 'john@example.com', TokenPurpose.REGISTRATION);
    });
});
