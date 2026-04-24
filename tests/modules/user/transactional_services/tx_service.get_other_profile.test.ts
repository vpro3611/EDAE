import { TxServiceGetOtherProfileService } from "../../../../src/modules/user/transactional_services/tx_service.get_other_profile";
import { TransactionManagerInterface } from "../../../../src/modules/infra/transaction_manager/transaction_manager.interface";
import { UserDtoMapper } from "../../../../src/modules/user/dto/user.dto.mapper";
import { RepositoryUserReader } from "../../../../src/modules/user/repository/repository.user.reader";
import { UserGetOtherProfileUseCase } from "../../../../src/modules/user/usecases/user.get_other_profile.usecase";
import { UserDtoForOthers } from "../../../../src/modules/user/dto/user.dto";

jest.mock("../../../../src/modules/user/repository/repository.user.reader");
jest.mock("../../../../src/modules/user/usecases/user.get_other_profile.usecase");

describe("TxServiceGetOtherProfileService", () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let txService: TxServiceGetOtherProfileService;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        txService = TxServiceGetOtherProfileService.create(txManager, UserDtoMapper.create());
    });

    it("runs inside a transaction and returns the other user dto", async () => {
        const mockDto: UserDtoForOthers = {
            id: "target-id", name: "Bob",
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        const getOtherProfileMock = jest.fn().mockResolvedValue(mockDto);
        (UserGetOtherProfileUseCase.create as jest.Mock).mockReturnValue({
            getOtherUserProfile: getOtherProfileMock,
        });

        const result = await txService.getOtherProfileService("actor-id", "target-id");

        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(UserGetOtherProfileUseCase.create).toHaveBeenCalled();
        expect(getOtherProfileMock).toHaveBeenCalledWith("actor-id", "target-id");
        expect(result).toBe(mockDto);
    });

    it("propagates errors thrown by the use case", async () => {
        (UserGetOtherProfileUseCase.create as jest.Mock).mockReturnValue({
            getOtherUserProfile: jest.fn().mockRejectedValue(new Error("not found")),
        });

        await expect(txService.getOtherProfileService("actor-id", "target-id"))
            .rejects.toThrow("not found");
    });
});
