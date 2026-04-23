import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interface.repository';
import { ConfirmEmailChangeUseCase } from '../../../../src/modules/user/usecases/user.confirm_email_change.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';
import { UserDtoMapper } from '../../../../src/modules/user/dto/user.dto.mapper';

describe('ConfirmEmailChangeUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockVerifyOtp: { execute: jest.Mock };
    let useCase: ConfirmEmailChangeUseCase;

    const makeUser = (pending_email: string | null = 'new@example.com') => User.restoreUser(
        'uuid-1', 'John Doe', 'john@example.com', 'hashed',
        new Date(), new Date(), false, true, 'hashed', null, pending_email
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
        mockVerifyOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new ConfirmEmailChangeUseCase(mockUserRepoReader, mockUserRepoWriter, mockVerifyOtp as any, UserDtoMapper.create());
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/User not found/);
    });

    it('should throw 400 if no pending email change', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(null));
        await expect(useCase.execute('uuid-1', '123456')).rejects.toThrow(/No pending email change/);
    });

    it('should verify OTP, apply pending_email, clear it, persist, and return dto', async () => {
        const user = makeUser('new@example.com');
        mockUserRepoReader.getUserById.mockResolvedValue(user);

        const result = await useCase.execute('uuid-1', '123456');

        expect(mockVerifyOtp.execute).toHaveBeenCalledWith('uuid-1', TokenPurpose.CHANGE_EMAIL, '123456');
        expect(user.email).toBe('new@example.com');
        expect(user.pending_email).toBeNull();
        expect(mockUserRepoWriter.updateUser).toHaveBeenCalledWith(user);
        expect(result.id).toBe('uuid-1');
        expect(result.email).toBe('new@example.com');
    });
});
