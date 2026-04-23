import { TxServiceConfirmPasswordReset } from "../../../../src/modules/user/transactional_services/tx_service.confirm_password_reset";
import { TransactionManagerInterface } from "../../../../src/modules/infra/transaction_manager/transaction_manager.interface";
import { InfraPasswordHasherInterface } from "../../../../src/modules/infra/password/infra.password_hasher.interface";
import { RepositoryUserReader } from "../../../../src/modules/user/repository/repository.user.reader";
import { RepositoryUserWriter } from "../../../../src/modules/user/repository/repository.user.writer";
import { RepositoryTokenReader } from "../../../../src/modules/token/repository/repository.token.reader";
import { RepositoryTokenWriter } from "../../../../src/modules/token/repository/repository.token.writer";
import { VerifyOtpUseCase } from "../../../../src/modules/token/usecases/token.verify_otp.usecase";
import { ConfirmPasswordResetUseCase } from "../../../../src/modules/user/usecases/user.confirm_password_reset.usecase";

jest.mock("../../../../src/modules/user/repository/repository.user.reader");
jest.mock("../../../../src/modules/user/repository/repository.user.writer");
jest.mock("../../../../src/modules/token/repository/repository.token.reader");
jest.mock("../../../../src/modules/token/repository/repository.token.writer");
jest.mock("../../../../src/modules/token/usecases/token.verify_otp.usecase");
jest.mock("../../../../src/modules/user/usecases/user.confirm_password_reset.usecase");

describe("TxServiceConfirmPasswordReset", () => {
  let txService: TxServiceConfirmPasswordReset;
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
    (VerifyOtpUseCase.create as jest.Mock).mockReturnValue({ execute: jest.fn() });
    (ConfirmPasswordResetUseCase.create as jest.Mock).mockReturnValue({
      execute: executeMock,
    });
    txService = TxServiceConfirmPasswordReset.create(txManager, hasher);
  });

  it("runs within a transaction", async () => {
    await txService.confirmPasswordResetService("user@example.com", "123456", "new-pass");

    expect(txManager.runInTransaction).toHaveBeenCalledTimes(1);
  });

  it("forwards email, otp, and newPassword to the use case", async () => {
    await txService.confirmPasswordResetService("user@example.com", "123456", "new-pass");

    expect(executeMock).toHaveBeenCalledWith("user@example.com", "123456", "new-pass");
  });

  it("propagates errors thrown by the use case", async () => {
    executeMock.mockRejectedValue(new Error("otp not found"));

    await expect(
      txService.confirmPasswordResetService("user@example.com", "bad-otp", "new-pass")
    ).rejects.toThrow("otp not found");
  });
});
