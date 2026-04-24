import {TransactionManagerInterface} from "../../infra/transaction_manager/transaction_manager.interface";
import {RepositoryUserReader} from "../repository/repository.user.reader";
import {RepositoryTokenWriter} from "../../token/repository/repository.token.writer";
import {InfraEmailSenderInterface} from "../../infra/email/infra.email_sender.interface";
import {RequestAccountDeletionUseCase} from "../usecases/user.request_account_deletion.usecase";
import {CreateOtpUseCase} from "../../token/usecases/token.create_otp.usecase";


export class TxServiceRequestAccountDeletion {
    constructor(private readonly txManager: TransactionManagerInterface,
                private readonly emailSender: InfraEmailSenderInterface) {
    }

    static create(txManager: TransactionManagerInterface, emailSender: InfraEmailSenderInterface) {
        return new TxServiceRequestAccountDeletion(txManager, emailSender);
    }

    async requestAccountDeletionService(id: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoReader = RepositoryUserReader.create(client);
            const otpTokenRepoWriter = RepositoryTokenWriter.create(client);

            const createOtpUseCase = CreateOtpUseCase.create(otpTokenRepoWriter, this.emailSender);

            const requestAccountDeletionUseCase = RequestAccountDeletionUseCase.create(userRepoReader, createOtpUseCase);

            return await requestAccountDeletionUseCase.execute(id);
        })
    }
}