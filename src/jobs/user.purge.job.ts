import cron from 'node-cron';
import { Pool } from 'pg';
import { UserRepoWriterInterface } from '../modules/user/interfaces/interface.repository';
import { RepositoryUserWriter } from '../modules/user/repository/repository.user.writer';

const DEFAULT_CRON_EXPR = '0 3 * * *';

export class UserPurgeJob {
    constructor(private readonly writer: UserRepoWriterInterface) {}

    static create(db: Pool): UserPurgeJob {
        return new UserPurgeJob(RepositoryUserWriter.create(db));
    }

    async run(): Promise<void> {
        const count = await this.writer.purgeDeletedUsers();
        console.log(`[UserPurgeJob] Purged ${count} soft-deleted user(s)`);
    }

    start(): void {
        const expr = process.env.USER_PURGE_CRON ?? DEFAULT_CRON_EXPR;

        if (!cron.validate(expr)) {
            console.error(`[UserPurgeJob] Invalid cron expression "${expr}" — job not scheduled`);
            return;
        }

        this.run().catch(e => console.error('[UserPurgeJob] Startup run failed:', e));

        cron.schedule(expr, () => {
            this.run().catch(e => console.error('[UserPurgeJob] Scheduled run failed:', e));
        });

        console.log(`[UserPurgeJob] Scheduled with expression "${expr}"`);
    }
}
