import { pool } from "./database";
import {RepositoryUserReader} from "./modules/user/repository/repository.user.reader";
import {RepositoryUserWriter} from "./modules/user/repository/repository.user.writer";
import {InfraPasswordBcryptImplementation} from "./modules/infra/password/infra.pasword_bcrypt.implementation";
import {UserChangePasswordUseCase} from "./modules/user/usecases/user.change_password.usecase";
import {RequestAccountDeletionUseCase} from "./modules/user/usecases/user.request_account_deletion.usecase";
import {ConfirmAccountDeletionUseCase} from "./modules/user/usecases/user.confirm_account_deletion.usecase";
import {UserUpdateNameUseCase} from "./modules/user/usecases/user.update_name.usecase";


export function createDepsContainer() {
    const userRepoReader = RepositoryUserReader.create(pool);
    const userRepoWriter = RepositoryUserWriter.create(pool);

    // Define a number of turns (salt rounds) for better protection.
    // As per default it is 12.
    const bcryptHasher = InfraPasswordBcryptImplementation.create(12);
    // ..................................................................................................^ HERE

    const userChangePasswordUseCase =
        UserChangePasswordUseCase.create(userRepoReader, userRepoWriter, bcryptHasher);

    const userUpdateNameUseCase =
        UserUpdateNameUseCase.create(userRepoReader, userRepoWriter);



}


export type DepsContainer = ReturnType<typeof createDepsContainer>;