import { JwtTokenService } from "../../../../../src/modules/authentification/jwt/service/jwt.token_service";
import jwt from 'jsonwebtoken';
import { AppError } from "../../../../../src/modules/errors/errors.global";

describe("JwtTokenService Unit Tests", () => {
  let service: JwtTokenService;
  const oldEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...oldEnv };
    process.env.ACCESS_TOKEN_SECRET = "access-secret";
    process.env.REFRESH_TOKEN_SECRET = "refresh-secret";
    service = JwtTokenService.create();
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  describe("generateAccessToken", () => {
    it("should generate a valid JWT access token", () => {
      const token = service.generateAccessToken("user-1");
      const decoded = jwt.decode(token) as any;
      expect(decoded.sub).toBe("user-1");
    });

    it("should throw error if ACCESS_TOKEN_SECRET is missing", () => {
      delete process.env.ACCESS_TOKEN_SECRET;
      expect(() => service.generateAccessToken("user-1")).toThrow(/ACCESS_TOKEN_SECRET is not defined/);
    });

    it("should throw error if REFRESH_TOKEN_SECRET is missing", () => {
      delete process.env.REFRESH_TOKEN_SECRET;
      expect(() => service.generateRefreshToken("user-1")).toThrow(/REFRESH_TOKEN_SECRET is not defined/);
    });
  });

  describe("verifyAccessToken", () => {
    it("should return payload for valid token", () => {
      const token = jwt.sign({ sub: "user-1" }, "access-secret");
      const payload = service.verifyAccessToken(token);
      expect(payload.sub).toBe("user-1");
    });

    it("should throw AppError for invalid token", () => {
      expect(() => service.verifyAccessToken("invalid")).toThrow(AppError);
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a valid JWT refresh token", () => {
      const token = service.generateRefreshToken("user-1");
      const decoded = jwt.decode(token) as any;
      expect(decoded.sub).toBe("user-1");
    });
  });

  describe("verifyRefreshToken", () => {
    it("should return payload for valid token", () => {
      const token = jwt.sign({ sub: "user-1" }, "refresh-secret");
      const payload = service.verifyRefreshToken(token);
      expect(payload.sub).toBe("user-1");
    });

    it("should throw AppError for invalid token", () => {
      expect(() => service.verifyRefreshToken("invalid")).toThrow(AppError);
    });
  });
});
