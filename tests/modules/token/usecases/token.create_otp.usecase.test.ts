import { CreateOtpUseCase } from '../../../../src/modules/token/usecases/token.create_otp.usecase';
import { TokenRepoWriterInterface } from '../../../../src/modules/token/interfaces/interface.repository';
import { InfraEmailSenderInterface } from '../../../../src/modules/infra/email/infra.email_sender.interface';
import { OtpToken, TokenPurpose } from '../../../../src/modules/token/entity/token';

describe('CreateOtpUseCase Unit Tests', () => {
    let mockTokenWriter: jest.Mocked<TokenRepoWriterInterface>;
    let mockEmailSender: jest.Mocked<InfraEmailSenderInterface>;
    let useCase: CreateOtpUseCase;

    beforeEach(() => {
        jest.spyOn(OtpToken, 'generate').mockReturnValue('123456');
        jest.spyOn(OtpToken, 'hash').mockImplementation((plain) => `sha256:${plain}`);

        mockTokenWriter = {
            createToken: jest.fn().mockResolvedValue(undefined),
            invalidatePreviousTokens: jest.fn().mockResolvedValue(undefined),
            markTokenAsUsed: jest.fn().mockResolvedValue(undefined),
        };
        mockEmailSender = {
            sendRegistrationOtp: jest.fn().mockResolvedValue(undefined),
            sendPasswordResetOtp: jest.fn().mockResolvedValue(undefined),
            sendEmailChangeOtp: jest.fn().mockResolvedValue(undefined),
            sendAccountDeletionOtp: jest.fn().mockResolvedValue(undefined),
        };
        useCase = new CreateOtpUseCase(mockTokenWriter, mockEmailSender);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should invalidate previous tokens before creating a new one', async () => {
        await useCase.execute('user-1', 'user@example.com', TokenPurpose.REGISTRATION);
        expect(mockTokenWriter.invalidatePreviousTokens).toHaveBeenCalledWith('user-1', TokenPurpose.REGISTRATION);
        const invalidateOrder = mockTokenWriter.invalidatePreviousTokens.mock.invocationCallOrder[0];
        const createOrder = mockTokenWriter.createToken.mock.invocationCallOrder[0];
        expect(invalidateOrder).toBeLessThan(createOrder);
    });

    it('should create a token with correct user_id, purpose, and hashed OTP', async () => {
        await useCase.execute('user-1', 'user@example.com', TokenPurpose.REGISTRATION);
        expect(mockTokenWriter.createToken).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-1',
                purpose: TokenPurpose.REGISTRATION,
                otp_hash: 'sha256:123456',
            }),
        );
    });

    it('should send registration email for REGISTRATION purpose', async () => {
        await useCase.execute('user-1', 'user@example.com', TokenPurpose.REGISTRATION);
        expect(mockEmailSender.sendRegistrationOtp).toHaveBeenCalledWith('user@example.com', '123456');
    });

    it('should send password reset email for RESET_PASSWORD purpose', async () => {
        await useCase.execute('user-1', 'user@example.com', TokenPurpose.RESET_PASSWORD);
        expect(mockEmailSender.sendPasswordResetOtp).toHaveBeenCalledWith('user@example.com', '123456');
    });

    it('should send email change email for CHANGE_EMAIL purpose', async () => {
        await useCase.execute('user-1', 'newemail@example.com', TokenPurpose.CHANGE_EMAIL);
        expect(mockEmailSender.sendEmailChangeOtp).toHaveBeenCalledWith('newemail@example.com', '123456');
    });

    it('should send account deletion email for DELETE_ACCOUNT purpose', async () => {
        await useCase.execute('user-1', 'user@example.com', TokenPurpose.DELETE_ACCOUNT);
        expect(mockEmailSender.sendAccountDeletionOtp).toHaveBeenCalledWith('user@example.com', '123456');
    });
});
