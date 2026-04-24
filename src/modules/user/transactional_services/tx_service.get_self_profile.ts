import {UserRepoReaderInterface} from "../interfaces/interface.repository";
import {UserDtoMapper} from "../dto/user.dto.mapper";
import {TransactionManagerInterface} from "../../infra/transaction_manager/transaction_manager.interface";
import {RepositoryUserReader} from "../repository/repository.user.reader";
import {UserGetSelfProfileUseCase} from "../usecases/user.get_self_profile.usecase";
import {UserDtoForSelf} from "../dto/user.dto";


export class TxServiceGetSelfProfile {
    constructor(private readonly txManager: TransactionManagerInterface,
                private readonly userDtoMapper: UserDtoMapper) {
    }

    static create(txManager: TransactionManagerInterface, userDtoMapper: UserDtoMapper) {
        return new TxServiceGetSelfProfile(txManager, userDtoMapper);
    }

    async getSelfProfileService(id: string): Promise<UserDtoForSelf> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoReader = RepositoryUserReader.create(client);

            const getSelfProfileUseCase = UserGetSelfProfileUseCase.create(userRepoReader, this.userDtoMapper);

            return await getSelfProfileUseCase.getSelfProfile(id);
        })
    }
}