import {TransactionManagerInterface} from "../../infra/transaction_manager/transaction_manager.interface";
import {RepositoryUserWriter} from "../repository/repository.user.writer";
import {RepositoryUserReader} from "../repository/repository.user.reader";
import {RepositoryTokenReader} from "../../token/repository/repository.token.reader";
import {RepositoryTokenWriter} from "../../token/repository/repository.token.writer";
import {VerifyOtpUseCase} from "../../token/usecases/token.verify_otp.usecase";
import {ConfirmAccountDeletionUseCase} from "../usecases/user.confirm_account_deletion.usecase";


export class TxServiceConfirmAccountDeletion {
    constructor(private readonly txManager: TransactionManagerInterface) {
    }

    static create(txManager: TransactionManagerInterface) {
        return new TxServiceConfirmAccountDeletion(txManager);
    }

    async confirmAccountDeletionService(id: string, otp: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoWriter = RepositoryUserWriter.create(client);
            const userRepoReader = RepositoryUserReader.create(client);
            const otpTokenRepoReader = RepositoryTokenReader.create(client);
            const otpTokenRepoWriter = RepositoryTokenWriter.create(client);

            const verifyOtpUseCase = VerifyOtpUseCase.create(otpTokenRepoReader, otpTokenRepoWriter);

            const confirmAccountDeletionUseCase = ConfirmAccountDeletionUseCase.create(userRepoReader, userRepoWriter, verifyOtpUseCase);

            return await confirmAccountDeletionUseCase.execute(id, otp);
        })
    }
}