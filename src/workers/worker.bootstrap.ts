import { Queue, Worker } from 'bullmq';
import { Pool } from 'pg';
import { GithubPollWorker } from './github.poll.worker';
import { GithubPollerService } from './github.poller';
import { NotificationDispatcher } from '../modules/notification/notification.dispatcher';
import { RepositorySubscriptionReader } from '../modules/subscription/repository/repository.subscription.reader';
import { InfraEncryptionInterface } from '../modules/infra/encryption/infra.encryption.interface';
import { InfraEmailSenderInterface } from '../modules/infra/email/infra.email_sender.interface';

const QUEUE_NAME = 'github-poll';
const JOB_KEY = 'github-poll-tick';
const POLL_INTERVAL_MS = 5 * 60 * 1000;

export async function bootstrapWorkers(
    db: Pool,
    encryption: InfraEncryptionInterface,
    emailSender: InfraEmailSenderInterface,
): Promise<void> {
    const redisConnection = {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
    };

    const queue = new Queue(QUEUE_NAME, { connection: redisConnection });

    await queue.add(
        JOB_KEY,
        {},
        {
            repeat: { every: POLL_INTERVAL_MS },
            jobId: JOB_KEY,
        },
    );

    const poller = GithubPollerService.create();
    const dispatcher = NotificationDispatcher.create(emailSender);
    const pollWorker = GithubPollWorker.create(db, encryption, poller, dispatcher);

    // Worker must be stored to prevent GC
    const worker = new Worker(
        QUEUE_NAME,
        async () => {
            const reader = RepositorySubscriptionReader.create(db, encryption);
            const subscriptions = await reader.getActiveSubscriptions();

            await Promise.allSettled(
                subscriptions.map(sub => pollWorker.processSubscription(sub)),
            );
        },
        { connection: redisConnection },
    );

    worker.on('error', (err) => console.error('[WorkerBootstrap] Worker error:', err));

    console.log(`[WorkerBootstrap] GitHub poll worker started — interval ${POLL_INTERVAL_MS / 1000}s`);
}
