import {TransactionManagerInterface} from "../../infra/transaction_manager/transaction_manager.interface";
import {InfraEmailSenderInterface} from "../../infra/email/infra.email_sender.interface";
import {RepositoryUserWriter} from "../repository/repository.user.writer";
import {RepositoryUserReader} from "../repository/repository.user.reader";
import {CreateOtpUseCase} from "../../token/usecases/token.create_otp.usecase";
import {RepositoryTokenWriter} from "../../token/repository/repository.token.writer";
import {RequestEmailChangeUseCase} from "../usecases/user.request_email_change.usecase";


export class TxServiceRequestEmailChange {
    constructor(private readonly txManager: TransactionManagerInterface,
                private readonly emailSender: InfraEmailSenderInterface) {
    }

    static create(txManager: TransactionManagerInterface, emailSender: InfraEmailSenderInterface) {
        return new TxServiceRequestEmailChange(txManager, emailSender);
    }

    async requestEmailChangeService(id: string, newEmail: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoWriter = RepositoryUserWriter.create(client);
            const userRepoReader = RepositoryUserReader.create(client);

            const otpTokenRepoWriter = RepositoryTokenWriter.create(client);

            const createOtpUseCase = CreateOtpUseCase.create(otpTokenRepoWriter, this.emailSender);

            const requestEmailChangeUseCase = RequestEmailChangeUseCase.create(userRepoReader, userRepoWriter, createOtpUseCase);

            return await requestEmailChangeUseCase.execute(id, newEmail);
        })
    }
}