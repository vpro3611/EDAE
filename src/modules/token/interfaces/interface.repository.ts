import { OtpToken, TokenPurpose } from '../entity/token';

export interface TokenRepoReaderInterface {
    getActiveToken(userId: string, purpose: TokenPurpose): Promise<OtpToken | null>;
}

export interface TokenRepoWriterInterface {
    createToken(data: { user_id: string; otp_hash: string; purpose: TokenPurpose; expires_at: Date }): Promise<void>;
    invalidatePreviousTokens(userId: string, purpose: TokenPurpose): Promise<void>;
    markTokenAsUsed(id: string): Promise<void>;
}
