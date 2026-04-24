import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interface.repository';
import { RequestEmailChangeUseCase } from '../../../../src/modules/user/usecases/user.request_email_change.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';

describe('RequestEmailChangeUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockCreateOtp: { execute: jest.Mock };
    let useCase: RequestEmailChangeUseCase;

    const makeUser = () => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), false, true, 'hashed', null, null
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
        mockCreateOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new RequestEmailChangeUseCase(mockUserRepoReader, mockUserRepoWriter, mockCreateOtp as any);
    });

    it('should throw for invalid new email format', async () => {
        await expect(useCase.execute('uuid-1', 'not-an-email')).rejects.toThrow(/valid email/);
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);
        await expect(useCase.execute('uuid-1', 'new@example.com')).rejects.toThrow(/User not found/);
    });

    it('should set pending_email, call updateUser, then call CreateOtp with new email', async () => {
        const user = makeUser();
        mockUserRepoReader.getUserById.mockResolvedValue(user);

        await useCase.execute('uuid-1', 'new@example.com');

        expect(user.pending_email).toBe('new@example.com');
        expect(mockUserRepoWriter.updateUser).toHaveBeenCalledWith(user);
        expect(mockCreateOtp.execute).toHaveBeenCalledWith('uuid-1', 'new@example.com', TokenPurpose.CHANGE_EMAIL);
    });

    it('should throw if user is not verified (via entity guard)', async () => {
        const user = User.restoreUser(
            'uuid-1', 'John Doe', 'john@example.com', 'hashed',
            new Date(), new Date(), false, false, 'hashed', null, null
        );
        mockUserRepoReader.getUserById.mockResolvedValue(user);
        await expect(useCase.execute('uuid-1', 'new@example.com')).rejects.toThrow(/not verified/);
    });
});
