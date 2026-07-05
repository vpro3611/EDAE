import { Queue, Worker } from 'bullmq';
import { Pool } from 'pg';
import { GithubPollWorker } from './github.poll.worker';
import { GithubPollerService } from './github.poller';
import { NotificationDispatcher } from '../modules/notification/notification.dispatcher';
import { RepositorySubscriptionReader } from '../modules/subscription/repository/repository.subscription.reader';
import { InfraEncryptionInterface } from '../modules/infra/encryption/infra.encryption.interface';
import { InfraEmailSenderInterface } from '../modules/infra/email/infra.email_sender.interface';
import { bootstrapReportWorker } from './report.worker';
import { getRedisConnectionOptions } from '../redis';

const QUEUE_NAME = 'github-poll';
const JOB_KEY = 'github-poll-tick';
const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;

export async function bootstrapWorkers(
    db: Pool,
    encryption: InfraEncryptionInterface,
    emailSender: InfraEmailSenderInterface,
): Promise<void> {
    const rawPollIntervalMs = Number(process.env.GITHUB_POLL_INTERVAL_MS ?? DEFAULT_POLL_INTERVAL_MS);
    const pollIntervalMs = Number.isFinite(rawPollIntervalMs) && rawPollIntervalMs > 0
        ? rawPollIntervalMs
        : DEFAULT_POLL_INTERVAL_MS;

    const redisConnection = getRedisConnectionOptions();

    const queue = new Queue(QUEUE_NAME, { connection: redisConnection });

    await queue.add(
        JOB_KEY,
        {},
        {
            repeat: { every: pollIntervalMs },
            jobId: JOB_KEY,
        },
    );

    const poller = GithubPollerService.create();
    const dispatcher = NotificationDispatcher.create(emailSender);
    const pollWorker = GithubPollWorker.create(db, encryption, poller, dispatcher);

    // Worker must be stored to prevent GC
    const worker = new Worker(
        QUEUE_NAME,
        async (job) => {
            console.log(`[WorkerBootstrap] tick fired - job=${job.id}`);
            const reader = RepositorySubscriptionReader.create(db, encryption);

            let subscriptions;
            try {
                subscriptions = await reader.getActiveSubscriptions();
            } catch (e) {
                console.error('[WorkerBootstrap] failed to load subscriptions:', e);
                return;
            }

            console.log(`[WorkerBootstrap] ${subscriptions.length} active subscription(s) to process`);
            if (subscriptions.length === 0) return;

            const results = await Promise.allSettled(
                subscriptions.map(sub => pollWorker.processSubscription(sub)),
            );

            const failed = results.filter(r => r.status === 'rejected');
            if (failed.length > 0) {
                failed.forEach(r => console.error('[WorkerBootstrap] subscription processing rejected:', (r as PromiseRejectedResult).reason));
            }
            console.log(`[WorkerBootstrap] tick complete - ${results.length - failed.length}/${results.length} subscriptions processed OK`);
        },
        { connection: redisConnection },
    );

    worker.on('error', (err) => console.error('[WorkerBootstrap] Worker error:', err));

    console.log(`[WorkerBootstrap] GitHub poll worker started - interval ${pollIntervalMs / 1000}s`);

    await bootstrapReportWorker(db, encryption, emailSender);
}
