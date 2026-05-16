import {RedisStorage, TokenBucket} from "@vpro3611/req-shield";
import {REDIS} from "./redis";
import {createExpressMiddleware} from "@vpro3611/req-shield/express";
import {Request} from "express";
import {throwAppError} from "./modules/errors/errors.global";

const storage = new RedisStorage(REDIS);


function constructLimiterWithPresets(
    capacity: number,
    refillAmount: number,
    refillIntervalMs: number,
    ) {
    return new TokenBucket({
        capacity: capacity,
        refillAmount: refillAmount,
        refillIntervalMs: refillIntervalMs,
        storage: storage,
    });
}

export function preDefinedPublicLimiters() {
    // регистрация — защита от ботов (жёстко)
    const registerTokenBucket = constructLimiterWithPresets(
        5,   // burst
        5,   // полный refill
        60_000
    );

    // подтверждение регистрации — защита от перебора кода (жёстко)
    const registerConfirmTokenBucket = constructLimiterWithPresets(
        5,
        5,
        300_000
    );

    // логин — баланс UX / brute-force (плавный)
    const loginTokenBucket = constructLimiterWithPresets(
        5,   // можно быстро попробовать
        1,   // дальше медленно
        15_000
    );

    // refresh — технический endpoint (плавный, но щедрый)
    const refreshTokenBucket = constructLimiterWithPresets(
        10,
        1,
        5_000
    );

    // logout — почти безопасно (очень мягко)
    const logoutTokenBucket = constructLimiterWithPresets(
        20,
        5,
        60_000
    );

    // сброс пароля — защита от спама email (жёстко)
    const passwordResetTokenBucket = constructLimiterWithPresets(
        3,
        3,
        300_000
    );

    // подтверждение сброса — защита от перебора токена (жёстко)
    const passwordResetConfirmTokenBucket = constructLimiterWithPresets(
        5,
        5,
        300_000
    );

    const metricsCheckTokenBucket = constructLimiterWithPresets(
        10,
        2,
        10_000
    );

    const healthCheckTokenBucket = constructLimiterWithPresets(
        10,
        2,
        10_000
    );

    return {
        registerTokenBucket,
        registerConfirmTokenBucket,
        loginTokenBucket,
        refreshTokenBucket,
        logoutTokenBucket,
        passwordResetTokenBucket,
        passwordResetConfirmTokenBucket,
        metricsCheckTokenBucket,
        healthCheckTokenBucket,
    };
}


// In here, we make a request limiter based on config (WithWhat) options. Names are self-explanatory; however,
// if there is no req.user.sub (a problem for private routes, isn't it?), we throw an error with code 401.
// If there is no req.ip, we use the remote IP address.
// NOTE: make sure to user `req.user` option from WithWhat ONLY on routes that require authentication (like, privateRouter),
// because there is no req.user.sub on public routes and privateRouter guarantees you that there is a req.user.sub.
// This is sort of a `semi-hack'. TypeScript does not remember the state and type between middlewares,
// so even if AuthService along with AuthMiddleware logically does not allow unauthenticated users, in here, we still need to
// double-check the type of req.user.sub and throw an error if it is not defined. (Although, it might never happen, because of AuthMiddleware.)
type WithEmail = {email: string};
type WithRefreshCookies = {refreshToken: string};
type WithWhat = 'ip' | 'req.user' | 'email+ip' | 'cookieToken';
export function constructMiddlewareWrapper(bucket: TokenBucket, withWhat: WithWhat, keyPrefix: string) {
    switch (withWhat) {
        case 'email+ip':
            return createExpressMiddleware(bucket, {
                keyGenerator: (req: Request) => {
                    const email = (req.body as WithEmail)?.email.toLowerCase().trim();
                    const ip = req.ip || `unknown:${req.socket.remoteAddress ?? "0.0.0.0"}`
                    return `${keyPrefix}:${ip}:${email}`
                },
                handler: (_req, res) => {
                    res.status(429).json({message: "Too many requests!"})
                },
            });
        case 'ip':
            return createExpressMiddleware(bucket, {
                keyGenerator: (req: Request) => {
                    const ip = req.ip || `unknown:${req.socket.remoteAddress ?? "0.0.0.0"}`
                    return `${keyPrefix}:${ip}`
                },
                handler: (_req, res) => {
                    res.status(429).json({message: "Too many requests!"})
                }
            })
        case 'req.user':
            return createExpressMiddleware(bucket, {
                keyGenerator: (req: Request) => {
                    const sub = req.user?.sub;
                    if (!sub) {
                        throwAppError(
                            "User not found.",
                            401,
                            "constructMiddlewareWrapper()",
                            "req.user"
                        )
                    }
                    return `${keyPrefix}:${sub}`
                },
                handler: (_req, res) => {
                    res.status(429).json({message: "Too many requests!"})
                }
            })
        case 'cookieToken':
            return createExpressMiddleware(bucket, {
                keyGenerator: (req: Request) => {
                    const cookieToken = (req.cookies as WithRefreshCookies).refreshToken;
                    if (!cookieToken) {
                        throwAppError(
                            "Refresh token not found.",
                             401,
                            "constructMiddlewareWrapper()",
                            "cookieToken"
                        )
                    }
                    return `${keyPrefix}:${cookieToken}`
                },
                handler: (_req, res) => {
                    res.status(429).json({message: "Too many requests!"})
                }
            })
    }
}