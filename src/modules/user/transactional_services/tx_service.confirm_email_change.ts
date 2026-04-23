import {TransactionManagerInterface} from "../../infra/transaction_manager/transaction_manager.interface";
import {RepositoryUserWriter} from "../repository/repository.user.writer";
import {RepositoryUserReader} from "../repository/repository.user.reader";
import {RepositoryTokenReader} from "../../token/repository/repository.token.reader";
import {RepositoryTokenWriter} from "../../token/repository/repository.token.writer";
import {VerifyOtpUseCase} from "../../token/usecases/token.verify_otp.usecase";
import {ConfirmEmailChangeUseCase} from "../usecases/user.confirm_email_change.usecase";
import {UserDtoMapper} from "../dto/user.dto.mapper";
import {UserDtoForSelf} from "../dto/user.dto";


export class TxServiceConfirmEmailChange {
    constructor(private readonly txManager: TransactionManagerInterface,
                private readonly userDtoMapper: UserDtoMapper) {
    }

    static create(txManager: TransactionManagerInterface, userDtoMapper: UserDtoMapper) {
        return new TxServiceConfirmEmailChange(txManager, userDtoMapper);
    }

    async confirmEmailChangeService(id: string, otp: string): Promise<UserDtoForSelf> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoWriter = RepositoryUserWriter.create(client);
            const userRepoReader = RepositoryUserReader.create(client);
            const otpTokenRepoReader = RepositoryTokenReader.create(client);
            const otpTokenRepoWriter = RepositoryTokenWriter.create(client);

            const verifyOtpUseCase = VerifyOtpUseCase.create(otpTokenRepoReader, otpTokenRepoWriter);

            const confirmEmailChangeUseCase = ConfirmEmailChangeUseCase
                .create(userRepoReader, userRepoWriter, verifyOtpUseCase, this.userDtoMapper);

            return await confirmEmailChangeUseCase.execute(id, otp);
        })
    }
}