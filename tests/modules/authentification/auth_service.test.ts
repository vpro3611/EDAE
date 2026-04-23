import { AuthentificationService } from "../../../src/modules/authentification/auth_service";
import { JwtTokenServiceInterface } from "../../../src/modules/authentification/jwt/interfaces/jwt.token_service.interface";
import { TransactionManagerInterface } from "../../../src/modules/infra/transaction_manager/transaction_manager.interface";
import { InfraPasswordHasherInterface } from "../../../src/modules/infra/password/infra.password_hasher.interface";
import { InfraEmailSenderInterface } from "../../../src/modules/infra/email/infra.email_sender.interface";
import { UserDtoMapper } from "../../../src/modules/user/dto/user.dto.mapper";
import { AppError } from "../../../src/modules/errors/errors.global";
import { User } from "../../../src/modules/user/entity/user";
import { JwtRefreshTokenRepository } from "../../../src/modules/authentification/jwt/repository/jwt.refresh_token.repository";
import { RepositoryUserReader } from "../../../src/modules/user/repository/repository.user.reader";
import { RequestRegistrationVerificationUseCase } from "../../../src/modules/user/usecases/user.request_registration_verification.usecase";
import { ConfirmRegistrationUseCase } from "../../../src/modules/user/usecases/user.confirm_registration.usecase";
import { UserLoginEmailUseCase } from "../../../src/modules/user/usecases/user.login_email.usecase";

jest.mock("../../../src/modules/authentification/jwt/repository/jwt.refresh_token.repository");
jest.mock("../../../src/modules/user/repository/repository.user.reader");
jest.mock("../../../src/modules/user/repository/repository.user.writer");
jest.mock("../../../src/modules/token/repository/repository.token.writer");
jest.mock("../../../src/modules/token/repository/repository.token.reader");
jest.mock("../../../src/modules/user/usecases/user.request_registration_verification.usecase");
jest.mock("../../../src/modules/user/usecases/user.confirm_registration.usecase");
jest.mock("../../../src/modules/user/usecases/user.login_email.usecase");

describe("AuthentificationService Unit Tests", () => {
  let authService: AuthentificationService;
  let jwtTokenService: jest.Mocked<JwtTokenServiceInterface>;
  let txManager: jest.Mocked<TransactionManagerInterface>;
  let hasher: jest.Mocked<InfraPasswordHasherInterface>;
  let emailSender: jest.Mocked<InfraEmailSenderInterface>;
  let userDtoMapper: UserDtoMapper;

  beforeEach(() => {
    jwtTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };

    txManager = {
      runInTransaction: jest.fn().mockImplementation(async (callback) => {
        return await callback({} as any);
      }),
    };

    hasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    emailSender = {
      sendRegistrationOtp: jest.fn(),
      sendPasswordResetOtp: jest.fn(),
      sendEmailChangeOtp: jest.fn(),
      sendAccountDeletionOtp: jest.fn(),
    };

    userDtoMapper = UserDtoMapper.create();

    authService = AuthentificationService.create(
      jwtTokenService,
      txManager,
      hasher,
      emailSender,
      userDtoMapper
    );
  });

  describe("refresh", () => {
    const refreshToken = "valid-refresh-token";
    const payload = { sub: "uuid-1" };
    const now = new Date();
    const mockUser = User.restoreUser(
      "uuid-1",
      "John Doe",
      "john@example.com",
      "hashed",
      now,
      now,
      false,
      true,
      "hashed",
      null,
      null
    );

    it("should successfully refresh tokens", async () => {
      jwtTokenService.verifyRefreshToken.mockReturnValue(payload);
      jwtTokenService.generateAccessToken.mockReturnValue("new-access");
      jwtTokenService.generateRefreshToken.mockReturnValue("new-refresh");

      const mockRefreshRepo = {
        findValidByHash: jest.fn().mockResolvedValue({
          id: "token-id",
          expiresAt: new Date(Date.now() + 10000),
        }),
        revokeById: jest.fn(),
        create: jest.fn(),
      };
      (JwtRefreshTokenRepository.create as jest.Mock).mockReturnValue(mockRefreshRepo);

      const mockUserReader = {
        getUserById: jest.fn().mockResolvedValue(mockUser),
      };
      (RepositoryUserReader.create as jest.Mock).mockReturnValue(mockUserReader);

      const result = await authService.refresh(refreshToken);

      expect(result.accessToken).toBe("new-access");
      expect(result.refreshToken).toBe("new-refresh");
      expect(result.user.id).toBe("uuid-1");
      expect(mockRefreshRepo.revokeById).toHaveBeenCalledWith("token-id");
      expect(mockRefreshRepo.create).toHaveBeenCalled();
    });

    it("should throw 404 if user is not found during refresh", async () => {
      jwtTokenService.verifyRefreshToken.mockReturnValue(payload);
      (JwtRefreshTokenRepository.create as jest.Mock).mockReturnValue({
        findValidByHash: jest.fn().mockResolvedValue({
          id: "token-id",
          expiresAt: new Date(Date.now() + 10000),
        }),
      });
      (RepositoryUserReader.create as jest.Mock).mockReturnValue({
        getUserById: jest.fn().mockResolvedValue(null),
      });

      await expect(authService.refresh(refreshToken)).rejects.toThrow("User not found.");
    });

    it("should throw 401 if refresh token is not found in DB", async () => {
      jwtTokenService.verifyRefreshToken.mockReturnValue(payload);
      (JwtRefreshTokenRepository.create as jest.Mock).mockReturnValue({
        findValidByHash: jest.fn().mockResolvedValue(null),
      });

      await expect(authService.refresh(refreshToken)).rejects.toThrow(AppError);
    });

    it("should throw 401 if refresh token is expired", async () => {
      jwtTokenService.verifyRefreshToken.mockReturnValue(payload);
      (JwtRefreshTokenRepository.create as jest.Mock).mockReturnValue({
        findValidByHash: jest.fn().mockResolvedValue({
          id: "token-id",
          expiresAt: new Date(Date.now() - 10000), // EXPIRED
        }),
      });

      await expect(authService.refresh(refreshToken)).rejects.toThrow("Refresh token has expired.");
    });
  });

  describe("registerRequest", () => {
    it("should execute registerRequestUseCase", async () => {
      const executeMock = jest.fn().mockResolvedValue(undefined);
      (RequestRegistrationVerificationUseCase.create as jest.Mock).mockReturnValue({
        execute: executeMock,
      });

      await authService.registerRequest("John", "john@example.com", "Pass123!");

      expect(executeMock).toHaveBeenCalledWith("John", "john@example.com", "Pass123!");
    });
  });

  describe("registerConfirm", () => {
    it("should execute registerConfirmUseCase and return tokens", async () => {
      const mockUserDto = { id: "uuid-1" } as any;
      const executeMock = jest.fn().mockResolvedValue(mockUserDto);
      (ConfirmRegistrationUseCase.create as jest.Mock).mockReturnValue({
        execute: executeMock,
      });

      jwtTokenService.generateAccessToken.mockReturnValue("access");
      jwtTokenService.generateRefreshToken.mockReturnValue("refresh");
      (JwtRefreshTokenRepository.create as jest.Mock).mockReturnValue({
        create: jest.fn(),
      });

      const result = await authService.registerConfirm("john@example.com", "123456");

      expect(result.user).toBe(mockUserDto);
      expect(result.accessToken).toBe("access");
      expect(executeMock).toHaveBeenCalledWith("john@example.com", "123456");
    });
  });

  describe("loginEmail", () => {
    it("should execute loginEmailUseCase and return tokens", async () => {
      const mockUserDto = { id: "uuid-1" } as any;
      const executeMock = jest.fn().mockResolvedValue(mockUserDto);
      (UserLoginEmailUseCase.create as jest.Mock).mockReturnValue({
        execute: executeMock,
      });

      jwtTokenService.generateAccessToken.mockReturnValue("access");
      jwtTokenService.generateRefreshToken.mockReturnValue("refresh");
      (JwtRefreshTokenRepository.create as jest.Mock).mockReturnValue({
        create: jest.fn(),
      });

      const result = await authService.loginEmail("john@example.com", "Pass123!");

      expect(result.loggedUser).toBe(mockUserDto);
      expect(result.accessToken).toBe("access");
      expect(executeMock).toHaveBeenCalledWith("john@example.com", "Pass123!");
    });
  });

  describe("logout", () => {
    it("should revoke the refresh token", async () => {
      const mockRefreshRepo = {
        revokeByHash: jest.fn().mockResolvedValue(undefined),
      };
      (JwtRefreshTokenRepository.create as jest.Mock).mockReturnValue(mockRefreshRepo);

      await authService.logout("some-token");

      expect(mockRefreshRepo.revokeByHash).toHaveBeenCalled();
    });
  });
});
