import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interface.repository';
import { ConfirmPasswordResetUseCase } from '../../../../src/modules/user/usecases/user.confirm_password_reset.usecase';
import { InfraPasswordHasherInterface } from '../../../../src/modules/infra/password/infra.password_hasher.interface';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';

describe('ConfirmPasswordResetUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockPasswordHasher: jest.Mocked<InfraPasswordHasherInterface>;
    let mockVerifyOtp: { execute: jest.Mock };
    let useCase: ConfirmPasswordResetUseCase;

    const makeUser = () => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'old_hashed',
        new Date(), new Date(), false, false, 'old_hashed', null, null
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
            updateUser: jest.fn().mockResolvedValue(undefined),
            deleteUser: jest.fn(),
            markUserAsVerified: jest.fn(),
        };
        mockPasswordHasher = { hash: jest.fn(), compare: jest.fn() };
        mockVerifyOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new ConfirmPasswordResetUseCase(
            mockUserRepoReader,
            mockUserRepoWriter,
            mockPasswordHasher,
            mockVerifyOtp as any,
        );
    });

    it('should throw for invalid email', async () => {
        await expect(useCase.execute('bad', '123456', 'NewPassword123!')).rejects.toThrow(/valid email/);
    });

    it('should throw for invalid password format', async () => {
        await expect(useCase.execute('john@example.com', '123456', 'weak')).rejects.toThrow(/Password must/);
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserByEmail.mockResolvedValue(null);
        await expect(useCase.execute('john@example.com', '123456', 'NewPassword123!')).rejects.toThrow(/User not found/);
    });

    it('should call verifyOtp, hash new password, resetPassword, and updateUser', async () => {
        const user = makeUser();
        mockUserRepoReader.getUserByEmail.mockResolvedValue(user);
        mockPasswordHasher.hash.mockResolvedValue('new_hashed');

        await useCase.execute('john@example.com', '123456', 'NewPassword123!');

        expect(mockVerifyOtp.execute).toHaveBeenCalledWith('uuid-1', TokenPurpose.RESET_PASSWORD, '123456');
        expect(mockPasswordHasher.hash).toHaveBeenCalledWith('NewPassword123!');
        expect(user.password_hashed).toBe('new_hashed');
        expect(user.last_password).toBe('new_hashed');
        expect(mockUserRepoWriter.updateUser).toHaveBeenCalledWith(user);
    });
});
