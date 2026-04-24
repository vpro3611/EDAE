import { VerifyOtpUseCase } from '../../../../src/modules/token/usecases/token.verify_otp.usecase';
import { TokenRepoReaderInterface, TokenRepoWriterInterface } from '../../../../src/modules/token/interfaces/interface.repository';
import { OtpToken, TokenPurpose } from '../../../../src/modules/token/entity/token';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('VerifyOtpUseCase Unit Tests', () => {
    let mockTokenReader: jest.Mocked<TokenRepoReaderInterface>;
    let mockTokenWriter: jest.Mocked<TokenRepoWriterInterface>;
    let useCase: VerifyOtpUseCase;

    const makeToken = (overrides: Partial<{ is_used: boolean; expires_at: Date }> = {}): OtpToken =>
        new OtpToken(
            'token-id',
            'user-1',
            OtpToken.hash('123456'),
            TokenPurpose.REGISTRATION,
            overrides.expires_at ?? new Date(Date.now() + 60000),
            overrides.is_used ?? false,
            new Date(),
        );

    beforeEach(() => {
        mockTokenReader = { getActiveToken: jest.fn() };
        mockTokenWriter = {
            createToken: jest.fn(),
            invalidatePreviousTokens: jest.fn(),
            markTokenAsUsed: jest.fn().mockResolvedValue(undefined),
        };
        useCase = new VerifyOtpUseCase(mockTokenReader, mockTokenWriter);
    });

    it('should throw 400 if no active token is found', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(null);
        await expect(useCase.execute('user-1', TokenPurpose.REGISTRATION, '123456'))
            .rejects.toThrow(/No active verification code/);
    });

    it('should throw 400 if token is already used', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(makeToken({ is_used: true }));
        await expect(useCase.execute('user-1', TokenPurpose.REGISTRATION, '123456'))
            .rejects.toThrow(/already been used/);
    });

    it('should throw 400 if token is expired', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(makeToken({ expires_at: new Date(Date.now() - 1000) }));
        await expect(useCase.execute('user-1', TokenPurpose.REGISTRATION, '123456'))
            .rejects.toThrow(/expired/);
    });

    it('should throw 400 if OTP hash does not match', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(makeToken());
        await expect(useCase.execute('user-1', TokenPurpose.REGISTRATION, '000000'))
            .rejects.toThrow(/Invalid or expired verification code/);
    });

    it('should mark token as used on success', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(makeToken());
        await useCase.execute('user-1', TokenPurpose.REGISTRATION, '123456');
        expect(mockTokenWriter.markTokenAsUsed).toHaveBeenCalledWith('token-id');
    });

    it('should resolve without throwing for valid OTP', async () => {
        mockTokenReader.getActiveToken.mockResolvedValue(makeToken());
        await expect(useCase.execute('user-1', TokenPurpose.REGISTRATION, '123456')).resolves.toBeUndefined();
    });
});
