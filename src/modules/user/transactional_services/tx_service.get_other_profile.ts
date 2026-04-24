import {TransactionManagerInterface} from "../../infra/transaction_manager/transaction_manager.interface";
import {UserDtoMapper} from "../dto/user.dto.mapper";
import {UserDtoForOthers} from "../dto/user.dto";
import {RepositoryUserReader} from "../repository/repository.user.reader";
import {UserGetOtherProfileUseCase} from "../usecases/user.get_other_profile.usecase";


export class TxServiceGetOtherProfileService {
    constructor(private readonly txManager: TransactionManagerInterface,
                private readonly userDtoMapper: UserDtoMapper) {
    }

    static create(txManager: TransactionManagerInterface, userDtoMapper: UserDtoMapper) {
        return new TxServiceGetOtherProfileService(txManager, userDtoMapper);
    }

    async getOtherProfileService(actorId: string, targetId: string): Promise<UserDtoForOthers> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoReader = RepositoryUserReader.create(client);

            const getOtherProfileUseCase = UserGetOtherProfileUseCase.create(userRepoReader, this.userDtoMapper);

            return await getOtherProfileUseCase.getOtherUserProfile(actorId, targetId);
        })
    }
}