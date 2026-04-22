import * as crypto from 'crypto';
import { throwAppError } from '../../errors/errors.global';

export enum TokenPurpose {
    REGISTRATION   = 'registration',
    RESET_PASSWORD = 'reset_password',
    CHANGE_EMAIL   = 'change_email',
    DELETE_ACCOUNT = 'delete_account',
}

export class OtpToken {
    constructor(
        public readonly id: string,
        public readonly user_id: string,
        public readonly otp_hash: string,
        public readonly purpose: TokenPurpose,
        public readonly expires_at: Date,
        public readonly is_used: boolean,
        public readonly created_at: Date,
    ) {}

    static generate(): string {
        return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    }

    static hash(plain: string): string {
        return crypto.createHash('sha256').update(plain).digest('hex');
    }

    static createForDatabase(
        userId: string,
        purpose: TokenPurpose,
        otpHash: string,
        ttlMinutes: number,
    ): { user_id: string; otp_hash: string; purpose: TokenPurpose; expires_at: Date } {
        const expires_at = new Date(Date.now() + ttlMinutes * 60 * 1000);
        return { user_id: userId, otp_hash: otpHash, purpose, expires_at };
    }

    static restore(row: {
        id: string;
        user_id: string;
        otp_hash: string;
        purpose: TokenPurpose;
        expires_at: Date;
        is_used: boolean;
        created_at: Date;
    }): OtpToken {
        return new OtpToken(
            row.id, row.user_id, row.otp_hash, row.purpose,
            row.expires_at, row.is_used, row.created_at,
        );
    }

    isExpired(): boolean {
        return this.expires_at < new Date();
    }

    assertValid(): void {
        if (this.is_used) {
            throwAppError('Verification code has already been used.', 400, 'OtpToken.assertValid()');
        }
        if (this.isExpired()) {
            throwAppError('Verification code has expired.', 400, 'OtpToken.assertValid()');
        }
    }
}
