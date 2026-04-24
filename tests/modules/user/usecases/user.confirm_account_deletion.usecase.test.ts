import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interface.repository';
import { ConfirmAccountDeletionUseCase } from '../../../../src/modules/user/usecases/user.confirm_account_deletion.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('ConfirmAccountDeletionUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockVerifyOtp: { execute: jest.Mock };
    let useCase: ConfirmAccountDeletionUseCase;

    const makeUser = (is_deleted = false) => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), is_deleted, true, 'hashed', null, null
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
            deleteUser: jest.fn().mockResolvedValue(undefined),
            markUserAsVerified: jest.fn(),
        };
        mockVerifyOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new ConfirmAccountDeletionUseCase(mockUserRepoReader, mockUserRepoWriter, mockVerifyOtp as any);
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/User not found/);
    });

    it('should throw 400 if user is already deleted', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(true));
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(AppError);
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/already deleted/);
    });

    it('should call VerifyOtp then deleteUser', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(false));
        await useCase.execute('uuid-1', '123456');
        expect(mockVerifyOtp.execute).toHaveBeenCalledWith('uuid-1', TokenPurpose.DELETE_ACCOUNT, '123456');
        expect(mockUserRepoWriter.deleteUser).toHaveBeenCalledWith('uuid-1');
    });
});
