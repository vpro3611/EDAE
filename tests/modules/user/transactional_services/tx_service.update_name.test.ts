import { TxServiceUpdateName } from "../../../../src/modules/user/transactional_services/tx_service.update_name";
import { TransactionManagerInterface } from "../../../../src/modules/infra/transaction_manager/transaction_manager.interface";
import { UserDtoMapper } from "../../../../src/modules/user/dto/user.dto.mapper";
import { User } from "../../../../src/modules/user/entity/user";
import { RepositoryUserReader } from "../../../../src/modules/user/repository/repository.user.reader";
import { RepositoryUserWriter } from "../../../../src/modules/user/repository/repository.user.writer";
import { UserUpdateNameUseCase } from "../../../../src/modules/user/usecases/user.update_name.usecase";

jest.mock("../../../../src/modules/user/repository/repository.user.reader");
jest.mock("../../../../src/modules/user/repository/repository.user.writer");
jest.mock("../../../../src/modules/user/usecases/user.update_name.usecase");

describe("TxServiceUpdateName Unit Tests", () => {
  let txService: TxServiceUpdateName;
  let txManager: jest.Mocked<TransactionManagerInterface>;
  let userDtoMapper: UserDtoMapper;

  beforeEach(() => {
    txManager = {
      runInTransaction: jest.fn().mockImplementation(async (callback) => {
        return await callback({} as any);
      }),
    };
    userDtoMapper = UserDtoMapper.create();
    txService = TxServiceUpdateName.create(txManager, userDtoMapper);
  });

  it("should run update name in transaction", async () => {
    const mockUserDto = { id: "1", name: "New Name" } as any;
    const executeMock = jest.fn().mockResolvedValue(mockUserDto);
    (UserUpdateNameUseCase.create as jest.Mock).mockReturnValue({
      execute: executeMock,
    });

    const result = await txService.updateNameService("1", "New Name");

    expect(result).toBe(mockUserDto);
    expect(txManager.runInTransaction).toHaveBeenCalled();
    expect(UserUpdateNameUseCase.create).toHaveBeenCalled();
    expect(executeMock).toHaveBeenCalledWith("1", "New Name");
  });
});
