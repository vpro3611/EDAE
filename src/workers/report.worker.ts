import { Queue, Worker } from 'bullmq';
import { Pool } from 'pg';
import { InfraEncryptionInterface } from '../modules/infra/encryption/infra.encryption.interface';
import { InfraEmailSenderInterface } from '../modules/infra/email/infra.email_sender.interface';
import { RepositoryReportConfigReader } from '../modules/report/repository/repository.report_config.reader';
import { RepositoryReportConfigWriter } from '../modules/report/repository/repository.report_config.writer';
import { RepositoryConnectionReader } from '../modules/connection/repository/repository.connection.reader';
import { RepositoryGithubSourceReader } from '../modules/github_source/repository/repository.github_source.reader';
import { FetchGithubActivityUseCase } from '../modules/report/usecases/fetch_github_activity.usecase';
import { PdfService } from '../modules/report/pdf/pdf.service';
import { NotificationDispatcher } from '../modules/notification/notification.dispatcher';
import { GenerateReportService } from '../modules/report/generate_report.service';
import { getRedisConnectionOptions } from '../redis';

const QUEUE_NAME = 'report-worker';
const JOB_KEY = 'report-tick';
const DEFAULT_INTERVAL_MS = 3600000; // 1 hour

export async function bootstrapReportWorker(
    db: Pool,
    encryption: InfraEncryptionInterface,
    emailSender: InfraEmailSenderInterface,
): Promise<void> {
    const rawInterval = Number(process.env.REPORT_WORKER_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
    const intervalMs = Number.isFinite(rawInterval) && rawInterval > 0 ? rawInterval : DEFAULT_INTERVAL_MS;

    const redisConnection = getRedisConnectionOptions();

    const queue = new Queue(QUEUE_NAME, { connection: redisConnection });
    await queue.add(JOB_KEY, {}, { repeat: { every: intervalMs }, jobId: JOB_KEY });

    const worker = new Worker(
        QUEUE_NAME,
        async (job) => {
            console.log(`[ReportWorker] tick fired - job=${job.id}`);
            const configReader = RepositoryReportConfigReader.create(db);
            const configs = await configReader.getAllActiveConfigs();
            const now = new Date();
            const dueConfigs = configs.filter(c => c.isDue(now));
            console.log(`[ReportWorker] ${dueConfigs.length}/${configs.length} configs due`);
            if (dueConfigs.length === 0) return;

            const configWriter = RepositoryReportConfigWriter.create(db);
            const connReader = RepositoryConnectionReader.create(db, encryption);
            const sourceReader = RepositoryGithubSourceReader.create(db, encryption);
            const fetchActivity = FetchGithubActivityUseCase.create(sourceReader);
            const pdfService = PdfService.create();
            const dispatcher = NotificationDispatcher.create(emailSender);
            const generateService = GenerateReportService.create(configReader, configWriter, connReader, fetchActivity, pdfService, dispatcher);

            const results = await Promise.allSettled(
                dueConfigs.map(c => generateService.generateForConfig(c.id, c.user_id)),
            );
            const failed = results.filter(r => r.status === 'rejected');
            if (failed.length > 0) {
                failed.forEach(r => console.error('[ReportWorker] report generation failed:', (r as PromiseRejectedResult).reason));
            }
            console.log(`[ReportWorker] tick complete - ${results.length - failed.length}/${results.length} reports OK`);
        },
        { connection: redisConnection },
    );

    worker.on('error', (err) => console.error('[ReportWorker] Worker error:', err));
    console.log(`[ReportWorker] started - interval ${intervalMs / 1000}s`);
}
