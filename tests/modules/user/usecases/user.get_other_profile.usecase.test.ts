import { UserGetOtherProfileUseCase } from "../../../../src/modules/user/usecases/user.get_other_profile.usecase";
import { UserRepoReaderInterface } from "../../../../src/modules/user/interfaces/interface.repository";
import { UserDtoMapper } from "../../../../src/modules/user/dto/user.dto.mapper";
import { User } from "../../../../src/modules/user/entity/user";
import { AppError } from "../../../../src/modules/errors/errors.global";

describe("UserGetOtherProfileUseCase", () => {
    let mockRepo: jest.Mocked<UserRepoReaderInterface>;
    let useCase: UserGetOtherProfileUseCase;

    const actor = User.restoreUser(
        "actor-id", "Alice", "alice@example.com", "hashed",
        new Date(), new Date(), false, true, "hashed", null, null
    );

    const target = User.restoreUser(
        "target-id", "Bob", "bob@example.com", "hashed",
        new Date(), new Date(), false, true, "hashed", null, null
    );

    beforeEach(() => {
        mockRepo = {
            getUserById: jest.fn(),
            getUserByEmail: jest.fn(),
            getNonDeletedUsers: jest.fn(),
            getVerifiedUsers: jest.fn(),
        };
        useCase = UserGetOtherProfileUseCase.create(mockRepo, UserDtoMapper.create());
    });

    it("returns UserDtoForOthers without email or is_verified", async () => {
        mockRepo.getUserById
            .mockResolvedValueOnce(actor)
            .mockResolvedValueOnce(target);

        const result = await useCase.getOtherUserProfile("actor-id", "target-id");

        expect(result.id).toBe("target-id");
        expect(result.name).toBe("Bob");
        expect((result as any).email).toBeUndefined();
        expect((result as any).is_verified).toBeUndefined();
    });

    it("throws 400 when actor and target are the same user", async () => {
        await expect(useCase.getOtherUserProfile("same-id", "same-id"))
            .rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 404 when actor is not found", async () => {
        mockRepo.getUserById
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(target);

        await expect(useCase.getOtherUserProfile("actor-id", "target-id"))
            .rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 404 when target is not found", async () => {
        mockRepo.getUserById
            .mockResolvedValueOnce(actor)
            .mockResolvedValueOnce(null);

        await expect(useCase.getOtherUserProfile("actor-id", "target-id"))
            .rejects.toMatchObject({ statusCode: 404 });
    });

    it("fetches actor then target in correct order", async () => {
        mockRepo.getUserById
            .mockResolvedValueOnce(actor)
            .mockResolvedValueOnce(target);

        await useCase.getOtherUserProfile("actor-id", "target-id");

        expect(mockRepo.getUserById).toHaveBeenNthCalledWith(1, "actor-id");
        expect(mockRepo.getUserById).toHaveBeenNthCalledWith(2, "target-id");
    });
});
