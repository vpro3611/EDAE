import {JwtTokenServiceInterface} from "../interfaces/jwt.token_service.interface";
import jwt from 'jsonwebtoken';
import {ACCESS_TOKEN_TIME, REFRESH_TOKEN_TIME} from "../jwt.config";
import {AccessTokenPayload, RefreshTokenPayload} from "../payload/payloads";
import {throwAppError} from "../../../errors/errors.global";


export class JwtTokenService implements JwtTokenServiceInterface {

    private moduleName = "JwtTokenService";

    static create(): JwtTokenService {
        return new JwtTokenService();
    }

    private checkAccessSecret(): string {
        if (!process.env.ACCESS_TOKEN_SECRET) {
            throw new Error(`ACCESS_TOKEN_SECRET is not defined. ${this.moduleName}`);
        }
        return process.env.ACCESS_TOKEN_SECRET;
    }

    private checkRefreshSecret(): string {
        if (!process.env.REFRESH_TOKEN_SECRET) {
            throw new Error(`REFRESH_TOKEN_SECRET is not defined. ${this.moduleName}`);
        }
        return process.env.REFRESH_TOKEN_SECRET;
    }

    generateAccessToken(userId: string): string {
        const accessToken = this.checkAccessSecret();

        return jwt.sign(
            {sub: userId}, accessToken, {expiresIn: ACCESS_TOKEN_TIME}
        );
    }

    generateRefreshToken(userId: string): string {
        const refreshToken = this.checkRefreshSecret();

        return jwt.sign(
            {sub: userId}, refreshToken, {expiresIn: REFRESH_TOKEN_TIME}
        )
    }

    verifyAccessToken(token: string): AccessTokenPayload {
        const accessToken = this.checkAccessSecret();

        try {
            return jwt.verify(token, accessToken) as AccessTokenPayload;
        } catch (error) {
            throwAppError(
                "Invalid access token.",
                401,
                `${this.moduleName}.verifyAccessToken()`
            );
        }
    }

    verifyRefreshToken(token: string): RefreshTokenPayload {
        const refreshToken = this.checkRefreshSecret();
        try {
            return jwt.verify(token, refreshToken) as RefreshTokenPayload;
        } catch (error) {
            throwAppError(
                "Invalid refresh token.",
                401,
                `${this.moduleName}.verifyRefreshToken()`
            );
        }
    }
}