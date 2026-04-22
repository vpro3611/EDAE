import { UserRepoReaderInterface, UserRepoWriterInterface } from "../../../../src/modules/user/interfaces/interface.repository";
import { UserChangePasswordUseCase } from "../../../../src/modules/user/usecases/user.change_password.usecase";
import { User } from "../../../../src/modules/user/entity/user";
import { AppError } from "../../../../src/modules/errors/errors.global";
import { InfraPasswordHasherInterface } from "../../../../src/modules/infra/password/infra.password_hasher.interface";

describe("UserChangePasswordUseCase Unit Tests", () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let mockPasswordHasher: jest.Mocked<InfraPasswordHasherInterface>;
    let useCase: UserChangePasswordUseCase;

    const validUser = User.restoreUser(
        "uuid-1",
        "John Doe",
        "test@example.com",
        "old_hashed",
        new Date(),
        new Date(),
        false,
        true,
        "old_hashed",
        null
    );

    beforeEach(() => {
        mockUserRepoReader = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        mockUserRepoWriter = {
            createUser: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            markUserAsVerified: jest.fn(),
        };
        mockPasswordHasher = {
            hash: jest.fn(),
            compare: jest.fn(),
        };
        useCase = new UserChangePasswordUseCase(mockUserRepoReader, mockUserRepoWriter, mockPasswordHasher);
    });

    it("should change password successfully", async () => {
        const oldPass = "OldPassword123!";
        const newPass = "NewPassword123!";
        const newHashed = "new_hashed";

        mockUserRepoReader.getUserById.mockResolvedValue(validUser);
        mockPasswordHasher.compare.mockResolvedValue(true);
        mockPasswordHasher.hash.mockResolvedValue(newHashed);

        await useCase.execute("uuid-1", oldPass, newPass);

        expect(validUser.password_hashed).toBe(newHashed);
        expect(validUser.last_password).toBe(newHashed);
        expect(mockUserRepoWriter.updateUser).toHaveBeenCalledWith(validUser);
    });

    it("should throw error if user not found", async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);

        await expect(useCase.execute("uuid-1", "OldPass123!Valid", "NewPass123!Valid"))
            .rejects.toThrow(/User not found/);
    });

    it("should throw error if new password is same as old plaintext password", async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(validUser);
        const pass = "SamePassword123!";

        await expect(useCase.execute("uuid-1", pass, pass))
            .rejects.toThrow(/New password must be different/);
    });

    it("should throw error if old password doesn't match hash", async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(validUser);
        mockPasswordHasher.compare.mockResolvedValue(false);

        await expect(useCase.execute("uuid-1", "WrongOld123!Valid", "NewPass123!Valid"))
            .rejects.toThrow(/Old password is incorrect/);
    });

    it("should throw error if new password fails validation", async () => {
        await expect(useCase.execute("uuid-1", "OldPass123!", "short"))
            .rejects.toThrow(/Password must be between/);
    });
});
