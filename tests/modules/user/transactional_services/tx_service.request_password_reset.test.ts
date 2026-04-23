import { TxServiceRequestPasswordReset } from "../../../../src/modules/user/transactional_services/tx_service.request_password_reset";
import { TransactionManagerInterface } from "../../../../src/modules/infra/transaction_manager/transaction_manager.interface";
import { InfraEmailSenderInterface } from "../../../../src/modules/infra/email/infra.email_sender.interface";
import { RepositoryUserReader } from "../../../../src/modules/user/repository/repository.user.reader";
import { RepositoryTokenWriter } from "../../../../src/modules/token/repository/repository.token.writer";
import { CreateOtpUseCase } from "../../../../src/modules/token/usecases/token.create_otp.usecase";
import { RequestPasswordResetUseCase } from "../../../../src/modules/user/usecases/user.request_password_reset.usecase";

jest.mock("../../../../src/modules/user/repository/repository.user.reader");
jest.mock("../../../../src/modules/token/repository/repository.token.writer");
jest.mock("../../../../src/modules/token/usecases/token.create_otp.usecase");
jest.mock("../../../../src/modules/user/usecases/user.request_password_reset.usecase");

describe("TxServiceRequestPasswordReset", () => {
  let txService: TxServiceRequestPasswordReset;
  let txManager: jest.Mocked<TransactionManagerInterface>;
  let emailSender: jest.Mocked<InfraEmailSenderInterface>;
  let executeMock: jest.Mock;

  beforeEach(() => {
    txManager = {
      runInTransaction: jest.fn().mockImplementation(async (callback) => {
        return await callback({} as any);
      }),
    };
    emailSender = {
      sendRegistrationOtp: jest.fn(),
      sendPasswordResetOtp: jest.fn(),
      sendEmailChangeOtp: jest.fn(),
      sendAccountDeletionOtp: jest.fn(),
    };
    executeMock = jest.fn().mockResolvedValue(undefined);
    (CreateOtpUseCase.create as jest.Mock).mockReturnValue({ execute: jest.fn() });
    (RequestPasswordResetUseCase.create as jest.Mock).mockReturnValue({
      execute: executeMock,
    });
    txService = TxServiceRequestPasswordReset.create(txManager, emailSender);
  });

  it("runs within a transaction", async () => {
    await txService.requestPasswordResetService("user@example.com");

    expect(txManager.runInTransaction).toHaveBeenCalledTimes(1);
  });

  it("forwards the email to the use case", async () => {
    await txService.requestPasswordResetService("user@example.com");

    expect(executeMock).toHaveBeenCalledWith("user@example.com");
  });

  it("propagates errors thrown by the use case", async () => {
    executeMock.mockRejectedValue(new Error("user not found"));

    await expect(
      txService.requestPasswordResetService("ghost@example.com")
    ).rejects.toThrow("user not found");
  });
});
