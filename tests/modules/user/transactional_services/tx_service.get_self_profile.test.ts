import { TxServiceGetSelfProfile } from "../../../../src/modules/user/transactional_services/tx_service.get_self_profile";
import { TransactionManagerInterface } from "../../../../src/modules/infra/transaction_manager/transaction_manager.interface";
import { UserDtoMapper } from "../../../../src/modules/user/dto/user.dto.mapper";
import { RepositoryUserReader } from "../../../../src/modules/user/repository/repository.user.reader";
import { UserGetSelfProfileUseCase } from "../../../../src/modules/user/usecases/user.get_self_profile.usecase";
import { UserDtoForSelf } from "../../../../src/modules/user/dto/user.dto";

jest.mock("../../../../src/modules/user/repository/repository.user.reader");
jest.mock("../../../../src/modules/user/usecases/user.get_self_profile.usecase");

describe("TxServiceGetSelfProfile", () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let txService: TxServiceGetSelfProfile;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        txService = TxServiceGetSelfProfile.create(txManager, UserDtoMapper.create());
    });

    it("runs inside a transaction and returns the user dto", async () => {
        const mockDto: UserDtoForSelf = {
            id: "uuid-1", name: "Alice", email: "alice@example.com",
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            is_verified: true,
        };
        const getSelfProfileMock = jest.fn().mockResolvedValue(mockDto);
        (UserGetSelfProfileUseCase.create as jest.Mock).mockReturnValue({ getSelfProfile: getSelfProfileMock });

        const result = await txService.getSelfProfileService("uuid-1");

        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(UserGetSelfProfileUseCase.create).toHaveBeenCalled();
        expect(getSelfProfileMock).toHaveBeenCalledWith("uuid-1");
        expect(result).toBe(mockDto);
    });

    it("propagates errors thrown by the use case", async () => {
        (UserGetSelfProfileUseCase.create as jest.Mock).mockReturnValue({
            getSelfProfile: jest.fn().mockRejectedValue(new Error("not found")),
        });

        await expect(txService.getSelfProfileService("uuid-x"))
            .rejects.toThrow("not found");
    });
});
