import { TxServiceConfirmEmailChange } from "../../../../src/modules/user/transactional_services/tx_service.confirm_email_change";
import { TransactionManagerInterface } from "../../../../src/modules/infra/transaction_manager/transaction_manager.interface";
import { UserDtoMapper } from "../../../../src/modules/user/dto/user.dto.mapper";
import { UserDtoForSelf } from "../../../../src/modules/user/dto/user.dto";
import { RepositoryUserReader } from "../../../../src/modules/user/repository/repository.user.reader";
import { RepositoryUserWriter } from "../../../../src/modules/user/repository/repository.user.writer";
import { RepositoryTokenReader } from "../../../../src/modules/token/repository/repository.token.reader";
import { RepositoryTokenWriter } from "../../../../src/modules/token/repository/repository.token.writer";
import { VerifyOtpUseCase } from "../../../../src/modules/token/usecases/token.verify_otp.usecase";
import { ConfirmEmailChangeUseCase } from "../../../../src/modules/user/usecases/user.confirm_email_change.usecase";

jest.mock("../../../../src/modules/user/repository/repository.user.reader");
jest.mock("../../../../src/modules/user/repository/repository.user.writer");
jest.mock("../../../../src/modules/token/repository/repository.token.reader");
jest.mock("../../../../src/modules/token/repository/repository.token.writer");
jest.mock("../../../../src/modules/token/usecases/token.verify_otp.usecase");
jest.mock("../../../../src/modules/user/usecases/user.confirm_email_change.usecase");

const mockUserDto: UserDtoForSelf = {
  id: "user-1",
  name: "Alice",
  email: "new@example.com",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  is_verified: true,
};

describe("TxServiceConfirmEmailChange", () => {
  let txService: TxServiceConfirmEmailChange;
  let txManager: jest.Mocked<TransactionManagerInterface>;
  let userDtoMapper: UserDtoMapper;
  let executeMock: jest.Mock;

  beforeEach(() => {
    txManager = {
      runInTransaction: jest.fn().mockImplementation(async (callback) => {
        return await callback({} as any);
      }),
    };
    userDtoMapper = UserDtoMapper.create();
    executeMock = jest.fn().mockResolvedValue(mockUserDto);
    (VerifyOtpUseCase.create as jest.Mock).mockReturnValue({ execute: jest.fn() });
    (ConfirmEmailChangeUseCase.create as jest.Mock).mockReturnValue({
      execute: executeMock,
    });
    txService = TxServiceConfirmEmailChange.create(txManager, userDtoMapper);
  });

  it("runs within a transaction", async () => {
    await txService.confirmEmailChangeService("user-1", "123456");

    expect(txManager.runInTransaction).toHaveBeenCalledTimes(1);
  });

  it("forwards userId and otp to the use case", async () => {
    await txService.confirmEmailChangeService("user-1", "123456");

    expect(executeMock).toHaveBeenCalledWith("user-1", "123456");
  });

  it("returns the updated user DTO from the use case", async () => {
    const result = await txService.confirmEmailChangeService("user-1", "123456");

    expect(result).toBe(mockUserDto);
  });

  it("propagates errors thrown by the use case", async () => {
    executeMock.mockRejectedValue(new Error("otp expired"));

    await expect(
      txService.confirmEmailChangeService("user-1", "expired-otp")
    ).rejects.toThrow("otp expired");
  });
});
