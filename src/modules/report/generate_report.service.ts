import { throwAppError } from '../errors/errors.global';
import { ReportConfigRepoReaderInterface, ReportConfigRepoWriterInterface } from './interfaces/interface.repository';
import { ConnectionRepoReaderInterface } from '../connection/interfaces/interface.repository';
import { FetchGithubActivityUseCase, RepoActivity } from './usecases/fetch_github_activity.usecase';
import { PdfService, ReportTemplateData } from './pdf/pdf.service';
import { NotificationDispatcher } from '../notification/notification.dispatcher';
import { ReportFrequency } from './entity/report_config';

export class GenerateReportService {
    private moduleName = 'GenerateReportService';

    private constructor(
        private readonly configReader: ReportConfigRepoReaderInterface,
        private readonly configWriter: ReportConfigRepoWriterInterface,
        private readonly connectionReader: ConnectionRepoReaderInterface,
        private readonly fetchActivityUseCase: FetchGithubActivityUseCase,
        private readonly pdfService: PdfService,
        private readonly dispatcher: NotificationDispatcher,
    ) {}

    static create(
        configReader: ReportConfigRepoReaderInterface,
        configWriter: ReportConfigRepoWriterInterface,
        connectionReader: ConnectionRepoReaderInterface,
        fetchActivityUseCase: FetchGithubActivityUseCase,
        pdfService: PdfService,
        dispatcher: NotificationDispatcher,
    ): GenerateReportService {
        return new GenerateReportService(configReader, configWriter, connectionReader, fetchActivityUseCase, pdfService, dispatcher);
    }

    async generateForConfig(configId: string, actorId: string): Promise<void> {
        const config = await this.configReader.getConfigById(configId);
        if (!config) {
            throwAppError('Report configuration not found.', 404, `${this.moduleName}.generateForConfig`);
        }

        config!.ensureOwnership(actorId, 'generateForConfig');
        config!.ensureActive('generateForConfig');

        const connection = await this.connectionReader.getConnectionById(config!.connection_id);
        if (!connection) {
            throwAppError('Connection not found.', 404, `${this.moduleName}.generateForConfig`);
        }
        connection!.ensureNotDeleted(`${this.moduleName}.generateForConfig`);

        const since = this.sinceDate(config!.frequency);
        const activities = await this.fetchActivityUseCase.execute(config!.user_id, since);
        const now = new Date();
        const pdfData = this.buildTemplateData(activities, since, now);
        const pdfBuffer = await this.pdfService.generatePdf(pdfData);
        const dateStr = now.toISOString().split('T')[0];
        const filename = `report-${config!.frequency}-${dateStr}.pdf`;
        const caption = `${config!.frequency.charAt(0).toUpperCase() + config!.frequency.slice(1)} Report — ${dateStr}`;

        await this.dispatcher.dispatchFile(connection!.credentials, pdfBuffer, filename, caption);
        await this.configWriter.updateLastSentAt(config!.id, new Date());
    }

    private sinceDate(frequency: ReportFrequency): Date {
        const now = new Date();
        switch (frequency) {
            case 'daily':
                return new Date(now.getTime() - 24 * 3600 * 1000);
            case 'weekly':
                return new Date(now.getTime() - 7 * 86400 * 1000);
            case 'monthly':
                return new Date(now.getTime() - 30 * 86400 * 1000);
        }
    }

    private buildTemplateData(activities: RepoActivity[], since: Date, until: Date): ReportTemplateData {
        const repos = activities.map(a => ({
            owner: a.source.repo_owner,
            name: a.source.repo_name,
            stars: a.stars,
            forks: a.forks,
            commits: a.commits,
            pullRequests: a.pullRequests,
            releases: a.releases,
            issuesOpened: a.issuesOpened,
            issuesClosed: a.issuesClosed,
            workflowRuns: a.workflowRuns,
        }));

        return {
            periodStart: since.toISOString(),
            periodEnd: until.toISOString(),
            totalCommits: repos.reduce((s, r) => s + r.commits.length, 0),
            totalPRs: repos.reduce((s, r) => s + r.pullRequests.length, 0),
            totalReleases: repos.reduce((s, r) => s + r.releases.length, 0),
            totalIssuesOpened: repos.reduce((s, r) => s + r.issuesOpened.length, 0),
            totalIssuesClosed: repos.reduce((s, r) => s + r.issuesClosed.length, 0),
            totalWorkflowRuns: repos.reduce((s, r) => s + r.workflowRuns.length, 0),
            repoCount: repos.length,
            repos,
        };
    }
}
