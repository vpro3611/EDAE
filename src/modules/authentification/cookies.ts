import { CookieOptions } from "express";
import { REFRESH_TOKEN_EXPIRATION_TIME_FOR_DATABASE } from "./jwt/jwt.config";

function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

export function getRefreshTokenCookieOptions(): CookieOptions {
    return {
        httpOnly: true,
        secure: isProduction(),
        sameSite: isProduction() ? "none" : "lax",
        maxAge: REFRESH_TOKEN_EXPIRATION_TIME_FOR_DATABASE,
    };
}

export function getRefreshTokenClearCookieOptions(): CookieOptions {
    return {
        httpOnly: true,
        secure: isProduction(),
        sameSite: isProduction() ? "none" : "lax",
    };
}
