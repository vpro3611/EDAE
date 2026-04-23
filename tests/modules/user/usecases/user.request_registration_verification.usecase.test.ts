import { UserRepoReaderInterface } from '../../../../src/modules/user/interfaces/interface.repository';
import { RequestRegistrationVerificationUseCase } from '../../../../src/modules/user/usecases/user.request_registration_verification.usecase';
import { CreateOtpUseCase } from '../../../../src/modules/token/usecases/token.create_otp.usecase';
import { User } from '../../../../src/modules/user/entity/user';
import { TokenPurpose } from '../../../../src/modules/token/entity/token';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('RequestRegistrationVerificationUseCase Unit Tests', () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockCreateOtp: { execute: jest.Mock };
    let useCase: RequestRegistrationVerificationUseCase;

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
        mockCreateOtp = { execute: jest.fn().mockResolvedValue(undefined) };
        useCase = new RequestRegistrationVerificationUseCase(
            mockUserRepoReader,
            mockCreateOtp as any,
        );
    });

    it('should throw 404 if user not found', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);
        await expect(useCase.execute('uuid-1')).rejects.toThrow(AppError);
        await expect(useCase.execute('uuid-1')).rejects.toThrow(/User not found/);
    });

    it('should throw 400 if user is already verified', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(true));
        await expect(useCase.execute('uuid-1')).rejects.toThrow(AppError);
        await expect(useCase.execute('uuid-1')).rejects.toThrow(/already verified/);
    });

    it('should call CreateOtpUseCase with correct args', async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(makeUser(false));
        await useCase.execute('uuid-1');
        expect(mockCreateOtp.execute).toHaveBeenCalledWith('uuid-1', 'john@example.com', TokenPurpose.REGISTRATION);
    });
});
