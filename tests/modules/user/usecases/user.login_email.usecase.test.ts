import { UserLoginEmailUseCase } from "../../../../src/modules/user/usecases/user.login_email.usecase";
import { UserRepoReaderInterface } from "../../../../src/modules/user/interfaces/interface.repository";
import { InfraPasswordHasherInterface } from "../../../../src/modules/infra/password/infra.password_hasher.interface";
import { UserDtoMapper } from "../../../../src/modules/user/dto/user.dto.mapper";
import { User } from "../../../../src/modules/user/entity/user";
import { AppError } from "../../../../src/modules/errors/errors.global";

describe("UserLoginEmailUseCase Unit Tests", () => {
  let useCase: UserLoginEmailUseCase;
  let userRepoReader: jest.Mocked<UserRepoReaderInterface>;
  let passwordHasher: jest.Mocked<InfraPasswordHasherInterface>;
  let userDtoMapper: UserDtoMapper;

  const now = new Date();
  const mockUser = User.restoreUser(
    "uuid-1",
    "John Doe",
    "john@example.com",
    "hashed-pass",
    now,
    now,
    false,
    true,
    "hashed-pass",
    null,
    null
  );

  beforeEach(() => {
    userRepoReader = {
      getUserByEmail: jest.fn(),
      getUserById: jest.fn(),
    } as any;

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    userDtoMapper = UserDtoMapper.create();
    useCase = UserLoginEmailUseCase.create(userRepoReader, passwordHasher, userDtoMapper);
  });

  describe("execute", () => {
    it("should successfully login with valid credentials", async () => {
      userRepoReader.getUserByEmail.mockResolvedValue(mockUser);
      passwordHasher.compare.mockResolvedValue(true);

      const result = await useCase.execute("john@example.com", "Password123!");

      expect(result).toEqual(userDtoMapper.mapToUserDto(mockUser));
      expect(userRepoReader.getUserByEmail).toHaveBeenCalledWith("john@example.com");
      expect(passwordHasher.compare).toHaveBeenCalledWith("Password123!", mockUser.password_hashed);
    });

    it("should throw error if email is invalid", async () => {
      await expect(useCase.execute("invalid-email", "Password123!"))
        .rejects.toThrow(AppError);
    });

    it("should throw error if password is too short", async () => {
      await expect(useCase.execute("john@example.com", "short"))
        .rejects.toThrow(AppError);
    });

    it("should throw 404 error if user is not found", async () => {
      userRepoReader.getUserByEmail.mockResolvedValue(null);

      try {
          await useCase.execute("john@example.com", "Password123!");
          fail("Should have thrown AppError");
      } catch (error: any) {
          expect(error).toBeInstanceOf(AppError);
          expect(error.statusCode).toBe(404);
          expect(error.message).toBe("User not found.");
      }
    });

    it("should throw 401 error if password comparison fails", async () => {
      userRepoReader.getUserByEmail.mockResolvedValue(mockUser);
      passwordHasher.compare.mockResolvedValue(false);

      try {
          await useCase.execute("john@example.com", "Password123!");
          fail("Should have thrown AppError");
      } catch (error: any) {
          expect(error).toBeInstanceOf(AppError);
          expect(error.statusCode).toBe(401);
          expect(error.message).toBe("Invalid password.");
      }
    });

    it("should throw 400 error if user is not verified", async () => {
      const unverifiedUser = User.restoreUser(
        "uuid-1",
        "John Doe",
        "john@example.com",
        "hashed-pass",
        now,
        now,
        false,
        false, // NOT VERIFIED
        "hashed-pass",
        null,
        null
      );
      userRepoReader.getUserByEmail.mockResolvedValue(unverifiedUser);

      try {
          await useCase.execute("john@example.com", "Password123!");
          fail("Should have thrown AppError");
      } catch (error: any) {
          expect(error).toBeInstanceOf(AppError);
          expect(error.statusCode).toBe(400);
          expect(error.message).toBe("User is not verified.");
      }
    });

    it("should throw 400 error if user is deleted", async () => {
      const deletedUser = User.restoreUser(
        "uuid-1",
        "John Doe",
        "john@example.com",
        "hashed-pass",
        now,
        now,
        true, // DELETED
        true,
        "hashed-pass",
        null,
        null
      );
      userRepoReader.getUserByEmail.mockResolvedValue(deletedUser);

      try {
          await useCase.execute("john@example.com", "Password123!");
          fail("Should have thrown AppError");
      } catch (error: any) {
          expect(error).toBeInstanceOf(AppError);
          expect(error.statusCode).toBe(400);
          expect(error.message).toBe("User already deleted.");
      }
    });
  });
});
