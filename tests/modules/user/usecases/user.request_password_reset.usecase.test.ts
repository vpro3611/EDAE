import { UserRepoReaderInterface } from '../../../../src/modules/user/interfaces/interface.repository';
import { RequestPasswordResetUseCase } from '../../../../src/modules/user/usecases/user.request_password_reset.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';

describe('RequestPasswordResetUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockCreateOtp: { execute: jest.Mock };
    let useCase: RequestPasswordResetUseCase;

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
        mockCreateOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new RequestPasswordResetUseCase(mockUserRepoReader, mockCreateOtp as any);
    });

    it('should throw AppError for invalid email format', async () => {
        await expect(useCase.execute('not-an-email')).rejects.toThrow(/valid email/);
    });

    it('should throw 404 if no user found for the email', async () => {
        mockUserRepoReader.getUserByEmail.mockResolvedValue(null);
        await expect(useCase.execute('john@example.com')).rejects.toThrow(/User not found/);
    });

    it('should call CreateOtpUseCase with correct args', async () => {
        mockUserRepoReader.getUserByEmail.mockResolvedValue(makeUser());
        await useCase.execute('john@example.com');
        expect(mockCreateOtp.execute).toHaveBeenCalledWith('uuid-1', 'john@example.com', TokenPurpose.RESET_PASSWORD);
    });
});
