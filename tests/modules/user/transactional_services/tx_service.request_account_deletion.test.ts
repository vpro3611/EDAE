import { TxServiceRequestAccountDeletion } from "../../../../src/modules/user/transactional_services/tx_service.request_account_deletion";
import { TransactionManagerInterface } from "../../../../src/modules/infra/transaction_manager/transaction_manager.interface";
import { InfraEmailSenderInterface } from "../../../../src/modules/infra/email/infra.email_sender.interface";
import { RepositoryUserReader } from "../../../../src/modules/user/repository/repository.user.reader";
import { RepositoryTokenWriter } from "../../../../src/modules/token/repository/repository.token.writer";
import { CreateOtpUseCase } from "../../../../src/modules/token/usecases/token.create_otp.usecase";
import { RequestAccountDeletionUseCase } from "../../../../src/modules/user/usecases/user.request_account_deletion.usecase";

jest.mock("../../../../src/modules/user/repository/repository.user.reader");
jest.mock("../../../../src/modules/token/repository/repository.token.writer");
jest.mock("../../../../src/modules/token/usecases/token.create_otp.usecase");
jest.mock("../../../../src/modules/user/usecases/user.request_account_deletion.usecase");

describe("TxServiceRequestAccountDeletion", () => {
  let txService: TxServiceRequestAccountDeletion;
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
    (RequestAccountDeletionUseCase.create as jest.Mock).mockReturnValue({
      execute: executeMock,
    });
    txService = TxServiceRequestAccountDeletion.create(txManager, emailSender);
  });

  it("runs within a transaction", async () => {
    await txService.requestAccountDeletionService("user-1");

    expect(txManager.runInTransaction).toHaveBeenCalledTimes(1);
  });

  it("forwards the userId to the use case", async () => {
    await txService.requestAccountDeletionService("user-1");

    expect(executeMock).toHaveBeenCalledWith("user-1");
  });

  it("propagates errors thrown by the use case", async () => {
    executeMock.mockRejectedValue(new Error("user not found"));

    await expect(
      txService.requestAccountDeletionService("unknown-user")
    ).rejects.toThrow("user not found");
  });
});
