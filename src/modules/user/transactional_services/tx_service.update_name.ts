import {TransactionManagerInterface} from "../../infra/transaction_manager/transaction_manager.interface";
import {RepositoryUserWriter} from "../repository/repository.user.writer";
import {RepositoryUserReader} from "../repository/repository.user.reader";
import {UserUpdateNameUseCase} from "../usecases/user.update_name.usecase";
import {UserDtoMapper} from "../dto/user.dto.mapper";
import {UserDtoForSelf} from "../dto/user.dto";


export class TxServiceUpdateName {
    constructor(private readonly txManager: TransactionManagerInterface,
                private readonly userDtoMapper: UserDtoMapper) {
    }

    static create(txManager: TransactionManagerInterface, userDtoMapper: UserDtoMapper) {
        return new TxServiceUpdateName(txManager, userDtoMapper);
    }

    async updateNameService(id: string, name: string): Promise<UserDtoForSelf> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoWriter = RepositoryUserWriter.create(client);
            const userRepoReader = RepositoryUserReader.create(client);

            const updateUserNameUseCase = UserUpdateNameUseCase
                .create(userRepoReader, userRepoWriter, this.userDtoMapper);

            return await updateUserNameUseCase.execute(id, name);
        })
    }
}