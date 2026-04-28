import { Request, Response, NextFunction } from "express";
import { TokenBucket } from "@vpro3611/req-shield";
import { AppError } from "../src/modules/errors/errors.global";

jest.mock("../src/redis", () => ({ REDIS: {} }));
jest.mock("@vpro3611/req-shield", () => ({
    RedisStorage: jest.fn(),
    TokenBucket: jest.fn(),
}));

import { constructMiddlewareWrapper, preDefinedPublicLimiters } from "../src/api_limiter";

const allowed = { allowed: true,  remaining: 9, resetInMs: 60_000 };
const denied  = { allowed: false, remaining: 0, resetInMs: 60_000 };

function makeBucket(result: typeof allowed | typeof denied) {
    return {
        consume: jest.fn().mockResolvedValue(result),
        options: { capacity: 10 },
    } as unknown as TokenBucket;
}

function makeCtx(overrides: Partial<Request> = {}) {
    const setHeader = jest.fn();
    const json      = jest.fn().mockReturnThis();
    const status    = jest.fn().mockReturnValue({ json });
    const req = {
        ip:     "1.2.3.4",
        socket: { remoteAddress: "1.2.3.4" },
        body:   {},
        cookies: {},
        user:   undefined,
        ...overrides,
    } as unknown as Request;
    const res  = { status, json, setHeader } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;
    return { req, res, next, status, json, setHeader };
}

// ─── ip ──────────────────────────────────────────────────────────────────────

describe("'ip' strategy", () => {
    it("keys on req.ip and calls next() when allowed", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "ip", "test");
        const { req, res, next } = makeCtx();

        await mw(req, res, next);

        expect(bucket.consume).toHaveBeenCalledWith("test:1.2.3.4");
        expect(next).toHaveBeenCalledWith();
    });

    it("falls back to socket.remoteAddress when req.ip is absent", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "ip", "test");
        const { req, res, next } = makeCtx({ ip: undefined });

        await mw(req, res, next);

        expect(bucket.consume).toHaveBeenCalledWith("test:unknown:1.2.3.4");
    });

    it("falls back to 0.0.0.0 when both req.ip and socket.remoteAddress are absent", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "ip", "test");
        const { req, res, next } = makeCtx({ ip: undefined, socket: { remoteAddress: undefined } as any });

        await mw(req, res, next);

        expect(bucket.consume).toHaveBeenCalledWith("test:unknown:0.0.0.0");
    });

    it("responds 429 when bucket denies the request", async () => {
        const bucket = makeBucket(denied);
        const mw = constructMiddlewareWrapper(bucket, "ip", "test");
        const { req, res, next, status, json } = makeCtx();

        await mw(req, res, next);

        expect(status).toHaveBeenCalledWith(429);
        expect(json).toHaveBeenCalledWith({ message: "Too many requests!" });
        expect(next).not.toHaveBeenCalled();
    });

    it("sets X-RateLimit-Limit and X-RateLimit-Remaining headers when allowed", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "ip", "test");
        const { req, res, next, setHeader } = makeCtx();

        await mw(req, res, next);

        expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 10);
        expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 9);
    });

    it("sets Retry-After header when denied", async () => {
        const bucket = makeBucket(denied);
        const mw = constructMiddlewareWrapper(bucket, "ip", "test");
        const { req, res, next, setHeader } = makeCtx();

        await mw(req, res, next);

        expect(setHeader).toHaveBeenCalledWith("Retry-After", 60);
    });
});

// ─── email+ip ─────────────────────────────────────────────────────────────────

describe("'email+ip' strategy", () => {
    it("keys on ip:email (lowercased + trimmed) and calls next() when allowed", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "email+ip", "test");
        const { req, res, next } = makeCtx({ body: { email: "  User@Example.COM  " } });

        await mw(req, res, next);

        expect(bucket.consume).toHaveBeenCalledWith("test:1.2.3.4:user@example.com");
        expect(next).toHaveBeenCalledWith();
    });

    it("falls back to socket.remoteAddress when req.ip is absent", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "email+ip", "test");
        const { req, res, next } = makeCtx({ ip: undefined, body: { email: "a@b.com" } });

        await mw(req, res, next);

        expect(bucket.consume).toHaveBeenCalledWith("test:unknown:1.2.3.4:a@b.com");
    });

    it("responds 429 when bucket denies the request", async () => {
        const bucket = makeBucket(denied);
        const mw = constructMiddlewareWrapper(bucket, "email+ip", "test");
        const { req, res, next, status, json } = makeCtx({ body: { email: "a@b.com" } });

        await mw(req, res, next);

        expect(status).toHaveBeenCalledWith(429);
        expect(json).toHaveBeenCalledWith({ message: "Too many requests!" });
        expect(next).not.toHaveBeenCalled();
    });

    it("sets X-RateLimit-Limit and X-RateLimit-Remaining headers when allowed", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "email+ip", "test");
        const { req, res, next, setHeader } = makeCtx({ body: { email: "a@b.com" } });

        await mw(req, res, next);

        expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 10);
        expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 9);
    });

    it("sets Retry-After header when denied", async () => {
        const bucket = makeBucket(denied);
        const mw = constructMiddlewareWrapper(bucket, "email+ip", "test");
        const { req, res, next, setHeader } = makeCtx({ body: { email: "a@b.com" } });

        await mw(req, res, next);

        expect(setHeader).toHaveBeenCalledWith("Retry-After", 60);
    });
});

// ─── req.user ─────────────────────────────────────────────────────────────────

describe("'req.user' strategy", () => {
    it("keys on req.user.sub and calls next() when allowed", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "req.user", "test");
        const { req, res, next } = makeCtx({ user: { sub: "uuid-123" } as any });

        await mw(req, res, next);

        expect(bucket.consume).toHaveBeenCalledWith("test:uuid-123");
        expect(next).toHaveBeenCalledWith();
    });

    it("responds 429 when bucket denies the request", async () => {
        const bucket = makeBucket(denied);
        const mw = constructMiddlewareWrapper(bucket, "req.user", "test");
        const { req, res, next, status, json } = makeCtx({ user: { sub: "uuid-123" } as any });

        await mw(req, res, next);

        expect(status).toHaveBeenCalledWith(429);
        expect(json).toHaveBeenCalledWith({ message: "Too many requests!" });
        expect(next).not.toHaveBeenCalled();
    });

    it("forwards AppError(401) to next() when req.user is absent", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "req.user", "test");
        const { req, res, next } = makeCtx({ user: undefined });

        await mw(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const err = (next as jest.Mock).mock.calls[0][0] as AppError;
        expect(err.statusCode).toBe(401);
        expect(bucket.consume).not.toHaveBeenCalled();
    });

    it("forwards AppError(401) to next() when req.user.sub is an empty string", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "req.user", "test");
        const { req, res, next } = makeCtx({ user: { sub: "" } as any });

        await mw(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const err = (next as jest.Mock).mock.calls[0][0] as AppError;
        expect(err.statusCode).toBe(401);
        expect(bucket.consume).not.toHaveBeenCalled();
    });

    it("sets X-RateLimit-Limit and X-RateLimit-Remaining headers when allowed", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "req.user", "test");
        const { req, res, next, setHeader } = makeCtx({ user: { sub: "uuid-123" } as any });

        await mw(req, res, next);

        expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 10);
        expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 9);
    });
});

// ─── cookieToken ──────────────────────────────────────────────────────────────

describe("'cookieToken' strategy", () => {
    it("keys on the refreshToken cookie and calls next() when allowed", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "cookieToken", "test");
        const { req, res, next } = makeCtx({ cookies: { refreshToken: "tok-xyz" } });

        await mw(req, res, next);

        expect(bucket.consume).toHaveBeenCalledWith("test:tok-xyz");
        expect(next).toHaveBeenCalledWith();
    });

    it("responds 429 when bucket denies the request", async () => {
        const bucket = makeBucket(denied);
        const mw = constructMiddlewareWrapper(bucket, "cookieToken", "test");
        const { req, res, next, status, json } = makeCtx({ cookies: { refreshToken: "tok-xyz" } });

        await mw(req, res, next);

        expect(status).toHaveBeenCalledWith(429);
        expect(json).toHaveBeenCalledWith({ message: "Too many requests!" });
        expect(next).not.toHaveBeenCalled();
    });

    it("forwards AppError(401) to next() when refreshToken cookie is absent", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "cookieToken", "test");
        const { req, res, next } = makeCtx({ cookies: {} });

        await mw(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const err = (next as jest.Mock).mock.calls[0][0] as AppError;
        expect(err.statusCode).toBe(401);
        expect(bucket.consume).not.toHaveBeenCalled();
    });

    it("sets X-RateLimit-Limit and X-RateLimit-Remaining headers when allowed", async () => {
        const bucket = makeBucket(allowed);
        const mw = constructMiddlewareWrapper(bucket, "cookieToken", "test");
        const { req, res, next, setHeader } = makeCtx({ cookies: { refreshToken: "tok-xyz" } });

        await mw(req, res, next);

        expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 10);
        expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 9);
    });

    it("sets Retry-After header when denied", async () => {
        const bucket = makeBucket(denied);
        const mw = constructMiddlewareWrapper(bucket, "cookieToken", "test");
        const { req, res, next, setHeader } = makeCtx({ cookies: { refreshToken: "tok-xyz" } });

        await mw(req, res, next);

        expect(setHeader).toHaveBeenCalledWith("Retry-After", 60);
    });
});

// ─── preDefinedPublicLimiters ─────────────────────────────────────────────────

describe("preDefinedPublicLimiters", () => {
    it("returns all 7 named buckets", () => {
        const buckets = preDefinedPublicLimiters();

        expect(buckets).toHaveProperty("registerTokenBucket");
        expect(buckets).toHaveProperty("registerConfirmTokenBucket");
        expect(buckets).toHaveProperty("loginTokenBucket");
        expect(buckets).toHaveProperty("refreshTokenBucket");
        expect(buckets).toHaveProperty("logoutTokenBucket");
        expect(buckets).toHaveProperty("passwordResetTokenBucket");
        expect(buckets).toHaveProperty("passwordResetConfirmTokenBucket");
    });

    it("creates independent bucket instances for each route", () => {
        const buckets = preDefinedPublicLimiters();
        const instances = Object.values(buckets);

        const uniqueInstances = new Set(instances);
        expect(uniqueInstances.size).toBe(instances.length);
    });
});
