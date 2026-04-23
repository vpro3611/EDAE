import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interface.repository';
import { ConfirmRegistrationUseCase } from '../../../../src/modules/user/usecases/user.confirm_registration.usecase';
import { VerifyOtpUseCase } from '../../../../src/modules/token/usecases/token.verify_otp.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('ConfirmRegistrationUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockVerifyOtp: { execute: jest.Mock };
    let useCase: ConfirmRegistrationUseCase;

    const makeUser = (is_verified = false) => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), false, is_verified, 'hashed', null, null
    );

    beforeEach(() => {
        mockUserRepoReader = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        mockUserRepoWriter = {
            createUser: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            markUserAsVerified: jest.fn().mockResolvedValue(undefined),
        };
        mockVerifyOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new ConfirmRegistrationUseCase(
            mockUserRepoReader,
            mockUserRepoWriter,
            mockVerifyOtp as any,
        );
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(AppError);
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/User not found/);
    });

    it('should throw 400 if user is already verified', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(true));
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(AppError);
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/already verified/);
    });

    it('should call VerifyOtpUseCase then markUserAsVerified', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(false));
        await useCase.execute('uuid-1', '123456');
        expect(mockVerifyOtp.execute).toHaveBeenCalledWith('uuid-1', TokenPurpose.REGISTRATION, '123456');
        expect(mockUserRepoWriter.markUserAsVerified).toHaveBeenCalledWith('uuid-1');
    });
});
