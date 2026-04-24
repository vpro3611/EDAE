import { TxServiceChangePassword } from "../../../../src/modules/user/transactional_services/tx_service.change_password";
import { TransactionManagerInterface } from "../../../../src/modules/infra/transaction_manager/transaction_manager.interface";
import { InfraPasswordHasherInterface } from "../../../../src/modules/infra/password/infra.password_hasher.interface";
import { RepositoryUserReader } from "../../../../src/modules/user/repository/repository.user.reader";
import { RepositoryUserWriter } from "../../../../src/modules/user/repository/repository.user.writer";
import { UserChangePasswordUseCase } from "../../../../src/modules/user/usecases/user.change_password.usecase";

jest.mock("../../../../src/modules/user/repository/repository.user.reader");
jest.mock("../../../../src/modules/user/repository/repository.user.writer");
jest.mock("../../../../src/modules/user/usecases/user.change_password.usecase");

describe("TxServiceChangePassword", () => {
  let txService: TxServiceChangePassword;
  let txManager: jest.Mocked<TransactionManagerInterface>;
  let hasher: jest.Mocked<InfraPasswordHasherInterface>;
  let executeMock: jest.Mock;

  beforeEach(() => {
    txManager = {
      runInTransaction: jest.fn().mockImplementation(async (callback) => {
        return await callback({} as any);
      }),
    };
    hasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
    executeMock = jest.fn().mockResolvedValue(undefined);
    (UserChangePasswordUseCase.create as jest.Mock).mockReturnValue({
      execute: executeMock,
    });
    txService = TxServiceChangePassword.create(txManager, hasher);
  });

  it("runs within a transaction", async () => {
    await txService.changePasswordService("user-1", "old-pass", "new-pass");

    expect(txManager.runInTransaction).toHaveBeenCalledTimes(1);
  });

  it("forwards id, oldPassword, and newPassword to the use case", async () => {
    await txService.changePasswordService("user-1", "old-pass", "new-pass");

    expect(executeMock).toHaveBeenCalledWith("user-1", "old-pass", "new-pass");
  });

  it("propagates errors thrown by the use case", async () => {
    executeMock.mockRejectedValue(new Error("wrong password"));

    await expect(
      txService.changePasswordService("user-1", "bad-pass", "new-pass")
    ).rejects.toThrow("wrong password");
  });
});
