import {TransactionManagerInterface} from "../../infra/transaction_manager/transaction_manager.interface";
import {InfraPasswordHasherInterface} from "../../infra/password/infra.password_hasher.interface";
import {RepositoryUserReader} from "../repository/repository.user.reader";
import {RepositoryUserWriter} from "../repository/repository.user.writer";
import {UserChangePasswordUseCase} from "../usecases/user.change_password.usecase";


export class TxServiceChangePassword {
    constructor(private readonly txManager: TransactionManagerInterface,
                private readonly hasher: InfraPasswordHasherInterface) {
    }

    static create(txManager: TransactionManagerInterface, hasher: InfraPasswordHasherInterface): TxServiceChangePassword {
        return new TxServiceChangePassword(txManager, hasher);
    }

    async changePasswordService(id: string, oldPassword: string, newPassword: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoReader = RepositoryUserReader.create(client);
            const userRepoWriter = RepositoryUserWriter.create(client);

            const changePasswordUseCase = UserChangePasswordUseCase.create(userRepoReader, userRepoWriter, this.hasher);

            return await changePasswordUseCase.execute(id, oldPassword, newPassword);
        })
    }
}