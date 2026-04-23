import {AccessTokenPayload, RefreshTokenPayload} from "../payload/payloads";


export interface JwtTokenServiceInterface {
    generateAccessToken(userId: string): string;
    generateRefreshToken(userId: string): string;
    verifyAccessToken(token: string): AccessTokenPayload;
    verifyRefreshToken(token: string): RefreshTokenPayload;
}