import { UserGetSelfProfileUseCase } from "../../../../src/modules/user/usecases/user.get_self_profile.usecase";
import { UserRepoReaderInterface } from "../../../../src/modules/user/interfaces/interface.repository";
import { UserDtoMapper } from "../../../../src/modules/user/dto/user.dto.mapper";
import { User } from "../../../../src/modules/user/entity/user";
import { AppError } from "../../../../src/modules/errors/errors.global";

describe("UserGetSelfProfileUseCase", () => {
    let mockRepo: jest.Mocked<UserRepoReaderInterface>;
    let useCase: UserGetSelfProfileUseCase;

    const activeVerifiedUser = User.restoreUser(
        "uuid-1", "Alice", "alice@example.com", "hashed",
        new Date(), new Date(),
        false, true, "hashed", null, null
    );

    const deletedUser = User.restoreUser(
        "uuid-2", "Bob", "bob@example.com", "hashed",
        new Date(), new Date(),
        true, true, "hashed", null, null
    );

    const unverifiedUser = User.restoreUser(
        "uuid-3", "Carol", "carol@example.com", "hashed",
        new Date(), new Date(),
        false, false, "hashed", null, null
    );

    beforeEach(() => {
        mockRepo = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        useCase = UserGetSelfProfileUseCase.create(mockRepo, UserDtoMapper.create());
    });

    it("returns a UserDtoForSelf for an active and verified user", async () => {
        mockRepo.getUserById.mockResolvedValue(activeVerifiedUser);

        const result = await useCase.getSelfProfile("uuid-1");

        expect(result.id).toBe("uuid-1");
        expect(result.name).toBe("Alice");
        expect(result.email).toBe("alice@example.com");
        expect(result.is_verified).toBe(true);
    });

    it("throws 404 when user does not exist", async () => {
        mockRepo.getUserById.mockResolvedValue(null);

        await expect(useCase.getSelfProfile("uuid-x"))
            .rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws when user is deleted", async () => {
        mockRepo.getUserById.mockResolvedValue(deletedUser);

        await expect(useCase.getSelfProfile("uuid-2"))
            .rejects.toBeInstanceOf(AppError);
    });

    it("throws when user is not verified", async () => {
        mockRepo.getUserById.mockResolvedValue(unverifiedUser);

        await expect(useCase.getSelfProfile("uuid-3"))
            .rejects.toBeInstanceOf(AppError);
    });
});
