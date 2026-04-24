import { UserRepoReaderInterface, UserRepoWriterInterface } from "../../../../src/modules/user/interfaces/interface.repository";
import { UserUpdateNameUseCase } from "../../../../src/modules/user/usecases/user.update_name.usecase";
import { User } from "../../../../src/modules/user/entity/user";
import { AppError } from "../../../../src/modules/errors/errors.global";
import { UserDtoMapper } from "../../../../src/modules/user/dto/user.dto.mapper";

describe("UserUpdateNameUseCase Unit Tests", () => {
    let mockUserRepoReader: jest.Mocked<UserRepoReaderInterface>;
    let mockUserRepoWriter: jest.Mocked<UserRepoWriterInterface>;
    let useCase: UserUpdateNameUseCase;

    const validUser = User.restoreUser(
        "uuid-1",
        "Old Name",
        "test@example.com",
        "hashed",
        new Date(),
        new Date(),
        false,
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
        useCase = new UserUpdateNameUseCase(mockUserRepoReader, mockUserRepoWriter, UserDtoMapper.create());
    });

    it("should update name successfully and return dto", async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(validUser);
        const newName = "New Name";

        const result = await useCase.execute("uuid-1", newName);

        expect(validUser.name).toBe(newName);
        expect(mockUserRepoWriter.updateUser).toHaveBeenCalledWith(validUser);
        expect(result.id).toBe("uuid-1");
        expect(result.name).toBe(newName);
    });

    it("should throw error if user not found", async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(null);

        await expect(useCase.execute("uuid-1", "New Name")).rejects.toThrow(AppError);
        await expect(useCase.execute("uuid-1", "New Name")).rejects.toThrow(/User not found/);
    });

    it("should throw error if name validation fails", async () => {
        mockUserRepoReader.getUserById.mockResolvedValue(validUser);

        await expect(useCase.execute("uuid-1", "J")).rejects.toThrow(AppError);
        await expect(useCase.execute("uuid-1", "J")).rejects.toThrow(/Name must be between/);
    });
});
