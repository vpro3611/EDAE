import { pool } from "./database";
import {RepositoryUserReader} from "./modules/user/repository/repository.user.reader";
import {RepositoryUserWriter} from "./modules/user/repository/repository.user.writer";


export function createDepsContainer() {
    const userRepoReader = RepositoryUserReader.create(pool);
    const userRepoWriter = RepositoryUserWriter.create(pool);

}


export type DepsContainer = ReturnType<typeof createDepsContainer>;