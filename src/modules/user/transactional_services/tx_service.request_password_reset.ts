import {TransactionManagerInterface} from "../../infra/transaction_manager/transaction_manager.interface";
import {InfraEmailSenderInterface} from "../../infra/email/infra.email_sender.interface";
import {RepositoryUserReader} from "../repository/repository.user.reader";
import {RepositoryUserWriter} from "../repository/repository.user.writer";
import {RepositoryTokenWriter} from "../../token/repository/repository.token.writer";
import {CreateOtpUseCase} from "../../token/usecases/token.create_otp.usecase";
import {RequestPasswordResetUseCase} from "../usecases/user.request_password_reset.usecase";


export class TxServiceRequestPasswordReset {
    constructor(private readonly txManager: TransactionManagerInterface,
                private readonly emailSender: InfraEmailSenderInterface) {
    }

    static create(txManager: TransactionManagerInterface, emailSender: InfraEmailSenderInterface) {
        return new TxServiceRequestPasswordReset(txManager, emailSender);
    }

    async requestPasswordResetService(email: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoReader = RepositoryUserReader.create(client);

            const otpTokenRepoWriter = RepositoryTokenWriter.create(client);

            const createOtpUseCase = CreateOtpUseCase.create(otpTokenRepoWriter, this.emailSender);

            const requestPasswordResetService = RequestPasswordResetUseCase.create(userRepoReader, createOtpUseCase);

            return await requestPasswordResetService.execute(email);
        })
    }
}