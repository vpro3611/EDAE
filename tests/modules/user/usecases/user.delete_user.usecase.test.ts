import { UserRepoReaderInterface, UserRepoWriterInterface } from "../../../../src/modules/user/interfaces/interface.repository";
import { DeleteUserUseCase } from "../../../../src/modules/user/usecases/user.delete_user.usecase";
import { User } from "../../../../src/modules/user/entity/user";
import { AppError } from "../../../../src/modules/errors/errors.global";

describe("DeleteUserUseCase Unit Tests", () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let useCase: DeleteUserUseCase;

    const createValidUser = (deleted = false) => User.restoreUser(
        "uuid-1",
        "John Doe",
        "test@example.com",
        "hashed",
        new Date(),
        new Date(),
        deleted,
        true,
        "hashed",
        null,
        null   // pending_email
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
        useCase = new DeleteUserUseCase(mockUserRepoReader, mockUserRepoWriter);
    });

    it("should soft delete user successfully", async () => {
        const user = createValidUser(false);
        mockUserRepoReader.getUserById.mockResolvedValue(user);

        await useCase.execute("uuid-1");

        expect(mockUserRepoWriter.deleteUser).toHaveBeenCalledWith("uuid-1");
    });

    it("should throw error if user not found", async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);

        await expect(useCase.execute("uuid-1")).rejects.toThrow(AppError);
        await expect(useCase.execute("uuid-1")).rejects.toThrow(/User not found/);
    });

    it("should throw error if user is already deleted", async () => {
        const user = createValidUser(true);
        mockUserRepoReader.getUserById.mockResolvedValue(user);

        await expect(useCase.execute("uuid-1")).rejects.toThrow(AppError);
        await expect(useCase.execute("uuid-1")).rejects.toThrow(/User already deleted/);
    });
});
