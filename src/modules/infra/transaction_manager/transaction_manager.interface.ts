import {PoolClient} from "pg";

export interface TransactionManagerInterface {
    runInTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>
}