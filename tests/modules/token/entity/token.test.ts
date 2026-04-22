import { OtpToken, TokenPurpose } from '../../../../src/modules/token/entity/token';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('OtpToken Entity', () => {

    describe('generate()', () => {
        it('should return a 6-character numeric string', () => {
            const otp = OtpToken.generate();
            expect(otp).toMatch(/^\d{6}$/);
        });

        it('should produce different values on repeated calls (probabilistic)', () => {
            const results = new Set(Array.from({ length: 10 }, () => OtpToken.generate()));
            expect(results.size).toBeGreaterThan(1);
        });
    });

    describe('hash()', () => {
        it('should return the same hash for the same input', () => {
            expect(OtpToken.hash('123456')).toBe(OtpToken.hash('123456'));
        });

        it('should return different hashes for different inputs', () => {
            expect(OtpToken.hash('123456')).not.toBe(OtpToken.hash('654321'));
        });

        it('should return a non-empty string', () => {
            expect(OtpToken.hash('123456').length).toBeGreaterThan(0);
        });
    });

    describe('createForDatabase()', () => {
        it('should return correct shape with future expires_at', () => {
            const before = new Date();
            const data = OtpToken.createForDatabase('user-1', TokenPurpose.REGISTRATION, 'hash123', 15);
            const after = new Date();

            expect(data.user_id).toBe('user-1');
            expect(data.otp_hash).toBe('hash123');
            expect(data.purpose).toBe(TokenPurpose.REGISTRATION);
            expect(data.expires_at.getTime()).toBeGreaterThan(before.getTime() + 14 * 60 * 1000);
            expect(data.expires_at.getTime()).toBeLessThanOrEqual(after.getTime() + 15 * 60 * 1000 + 100);
        });
    });

    describe('isExpired()', () => {
        it('should return true for a past expires_at', () => {
            const token = new OtpToken('id', 'uid', 'hash', TokenPurpose.REGISTRATION, new Date(Date.now() - 1000), false, new Date());
            expect(token.isExpired()).toBe(true);
        });

        it('should return false for a future expires_at', () => {
            const token = new OtpToken('id', 'uid', 'hash', TokenPurpose.REGISTRATION, new Date(Date.now() + 60000), false, new Date());
            expect(token.isExpired()).toBe(false);
        });
    });

    describe('assertValid()', () => {
        it('should throw AppError 400 if token is used', () => {
            const token = new OtpToken('id', 'uid', 'hash', TokenPurpose.REGISTRATION, new Date(Date.now() + 60000), true, new Date());
            expect(() => token.assertValid()).toThrow(AppError);
            expect(() => token.assertValid()).toThrow(/already been used/);
        });

        it('should throw AppError 400 if token is expired', () => {
            const token = new OtpToken('id', 'uid', 'hash', TokenPurpose.REGISTRATION, new Date(Date.now() - 1000), false, new Date());
            expect(() => token.assertValid()).toThrow(AppError);
            expect(() => token.assertValid()).toThrow(/expired/);
        });

        it('should not throw for a valid token', () => {
            const token = new OtpToken('id', 'uid', 'hash', TokenPurpose.REGISTRATION, new Date(Date.now() + 60000), false, new Date());
            expect(() => token.assertValid()).not.toThrow();
        });
    });
});
