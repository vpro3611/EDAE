import { TxServiceConfirmAccountDeletion } from "../../../../src/modules/user/transactional_services/tx_service.confirm_account_deletion";
import { TransactionManagerInterface } from "../../../../src/modules/infra/transaction_manager/transaction_manager.interface";
import { RepositoryUserReader } from "../../../../src/modules/user/repository/repository.user.reader";
import { RepositoryUserWriter } from "../../../../src/modules/user/repository/repository.user.writer";
import { RepositoryTokenReader } from "../../../../src/modules/token/repository/repository.token.reader";
import { RepositoryTokenWriter } from "../../../../src/modules/token/repository/repository.token.writer";
import { VerifyOtpUseCase } from "../../../../src/modules/token/usecases/token.verify_otp.usecase";
import { ConfirmAccountDeletionUseCase } from "../../../../src/modules/user/usecases/user.confirm_account_deletion.usecase";

jest.mock("../../../../src/modules/user/repository/repository.user.reader");
jest.mock("../../../../src/modules/user/repository/repository.user.writer");
jest.mock("../../../../src/modules/token/repository/repository.token.reader");
jest.mock("../../../../src/modules/token/repository/repository.token.writer");
jest.mock("../../../../src/modules/token/usecases/token.verify_otp.usecase");
jest.mock("../../../../src/modules/user/usecases/user.confirm_account_deletion.usecase");

describe("TxServiceConfirmAccountDeletion", () => {
  let txService: TxServiceConfirmAccountDeletion;
  let txManager: jest.Mocked<TransactionManagerInterface>;
  let executeMock: jest.Mock;

  beforeEach(() => {
    txManager = {
      runInTransaction: jest.fn().mockImplementation(async (callback) => {
        return await callback({} as any);
      }),
    };
    executeMock = jest.fn().mockResolvedValue(undefined);
    (VerifyOtpUseCase.create as jest.Mock).mockReturnValue({ execute: jest.fn() });
    (ConfirmAccountDeletionUseCase.create as jest.Mock).mockReturnValue({
      execute: executeMock,
    });
    txService = TxServiceConfirmAccountDeletion.create(txManager);
  });

  it("runs within a transaction", async () => {
    await txService.confirmAccountDeletionService("user-1", "123456");

    expect(txManager.runInTransaction).toHaveBeenCalledTimes(1);
  });

  it("forwards userId and otp to the use case", async () => {
    await txService.confirmAccountDeletionService("user-1", "123456");

    expect(executeMock).toHaveBeenCalledWith("user-1", "123456");
  });

  it("propagates errors thrown by the use case", async () => {
    executeMock.mockRejectedValue(new Error("invalid otp"));

    await expect(
      txService.confirmAccountDeletionService("user-1", "wrong-otp")
    ).rejects.toThrow("invalid otp");
  });
});
