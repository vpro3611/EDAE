import { TxServiceRequestEmailChange } from "../../../../src/modules/user/transactional_services/tx_service.request_email_change";
import { TransactionManagerInterface } from "../../../../src/modules/infra/transaction_manager/transaction_manager.interface";
import { InfraEmailSenderInterface } from "../../../../src/modules/infra/email/infra.email_sender.interface";
import { RepositoryUserReader } from "../../../../src/modules/user/repository/repository.user.reader";
import { RepositoryUserWriter } from "../../../../src/modules/user/repository/repository.user.writer";
import { RepositoryTokenWriter } from "../../../../src/modules/token/repository/repository.token.writer";
import { CreateOtpUseCase } from "../../../../src/modules/token/usecases/token.create_otp.usecase";
import { RequestEmailChangeUseCase } from "../../../../src/modules/user/usecases/user.request_email_change.usecase";

jest.mock("../../../../src/modules/user/repository/repository.user.reader");
jest.mock("../../../../src/modules/user/repository/repository.user.writer");
jest.mock("../../../../src/modules/token/repository/repository.token.writer");
jest.mock("../../../../src/modules/token/usecases/token.create_otp.usecase");
jest.mock("../../../../src/modules/user/usecases/user.request_email_change.usecase");

describe("TxServiceRequestEmailChange", () => {
  let txService: TxServiceRequestEmailChange;
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
    (RequestEmailChangeUseCase.create as jest.Mock).mockReturnValue({
      execute: executeMock,
    });
    txService = TxServiceRequestEmailChange.create(txManager, emailSender);
  });

  it("runs within a transaction", async () => {
    await txService.requestEmailChangeService("user-1", "new@example.com");

    expect(txManager.runInTransaction).toHaveBeenCalledTimes(1);
  });

  it("forwards userId and newEmail to the use case", async () => {
    await txService.requestEmailChangeService("user-1", "new@example.com");

    expect(executeMock).toHaveBeenCalledWith("user-1", "new@example.com");
  });

  it("propagates errors thrown by the use case", async () => {
    executeMock.mockRejectedValue(new Error("email already in use"));

    await expect(
      txService.requestEmailChangeService("user-1", "taken@example.com")
    ).rejects.toThrow("email already in use");
  });
});
