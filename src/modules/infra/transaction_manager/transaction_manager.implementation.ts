import {Pool, PoolClient} from "pg";
import {TransactionManagerInterface} from "./transaction_manager.interface";
import {AppError, throwAppError} from "../../errors/errors.global";


export class TransactionManager implements TransactionManagerInterface {

    private moduleName = "TransactionManager";

    constructor(private readonly pool: Pool) {
    }

    static create(pool: Pool): TransactionManager {
        return new TransactionManager(pool);
    }

    private assertError(e: unknown): never {
        if (e instanceof AppError) {
            throwAppError(
                e.message,
                e.statusCode,
                e.internalError,
                e.originalErrorMessage
            );
        }
        if (e instanceof Error) {
            throwAppError(
                "Something went wrong. Please try again later.",
                500,
                `${this.moduleName}.runInTransaction()`,
                e.message
            )
        }
        throw e;
    }

    async runInTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();

        try {
            await client.query("BEGIN");

            const result = await callback(client);

            await client.query("COMMIT");

            return result;
        } catch (e) {
            await client.query("ROLLBACK");
            this.assertError(e);
        } finally {
            client.release();
        }
    }
}