import {TransactionManagerInterface} from "../../infra/transaction_manager/transaction_manager.interface";
import {RepositoryUserWriter} from "../repository/repository.user.writer";
import {RepositoryUserReader} from "../repository/repository.user.reader";
import {InfraPasswordHasherInterface} from "../../infra/password/infra.password_hasher.interface";
import {RepositoryTokenReader} from "../../token/repository/repository.token.reader";
import {RepositoryTokenWriter} from "../../token/repository/repository.token.writer";
import {VerifyOtpUseCase} from "../../token/usecases/token.verify_otp.usecase";
import {ConfirmPasswordResetUseCase} from "../usecases/user.confirm_password_reset.usecase";


export class TxServiceConfirmPasswordReset {
    constructor(private readonly txManager: TransactionManagerInterface,
                private readonly hasher: InfraPasswordHasherInterface) {
    }

    static create(txManager: TransactionManagerInterface, hasher: InfraPasswordHasherInterface) {
        return new TxServiceConfirmPasswordReset(txManager, hasher);
    }

    async confirmPasswordResetService(email: string, otp: string, newPassword: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoWriter = RepositoryUserWriter.create(client);
            const userRepoReader = RepositoryUserReader.create(client);

            const otpTokeRepoReader = RepositoryTokenReader.create(client);
            const otpTokenRepoWriter = RepositoryTokenWriter.create(client);

            const verifyOtpUseCase = VerifyOtpUseCase.create(otpTokeRepoReader, otpTokenRepoWriter);

            const confirmPasswordResetUseCase = ConfirmPasswordResetUseCase
                .create(userRepoReader, userRepoWriter, this.hasher, verifyOtpUseCase);

            return await confirmPasswordResetUseCase.execute(email, otp, newPassword)
        })
    }
}