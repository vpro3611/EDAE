import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';

export type CommitEntry        = { sha: string; message: string; author: string; date: string };
export type PullRequestEntry   = { number: number; title: string; state: 'open' | 'closed' | 'merged'; created_at: string };
export type ReleaseEntry       = { tag_name: string; name: string; published_at: string; url: string };
export type IssueEntry         = { number: number; title: string; created_at: string; url: string };
export type ClosedIssueEntry   = { number: number; title: string; closed_at: string; url: string };
export type WorkflowRunEntry   = { name: string; conclusion: string; created_at: string; url: string };

export type RepoEntry = {
    owner: string;
    name: string;
    stars: number;
    forks: number;
    commits: CommitEntry[];
    pullRequests: PullRequestEntry[];
    releases: ReleaseEntry[];
    issuesOpened: IssueEntry[];
    issuesClosed: ClosedIssueEntry[];
    workflowRuns: WorkflowRunEntry[];
};

export type ReportTemplateData = {
    periodStart: string;
    periodEnd: string;
    totalCommits: number;
    totalPRs: number;
    totalReleases: number;
    totalIssuesOpened: number;
    totalIssuesClosed: number;
    totalWorkflowRuns: number;
    repoCount: number;
    repos: RepoEntry[];
};

export class PdfService {
    static create(): PdfService {
        return new PdfService();
    }

    async generatePdf(data: ReportTemplateData): Promise<Buffer> {
        const templateSource = fs.readFileSync(
            path.join(__dirname, 'templates', 'report.hbs'),
            'utf8',
        );
        const template = Handlebars.compile(templateSource);
        const html = template(data);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdf = await page.pdf({ format: 'A4', printBackground: true });
            return Buffer.from(pdf);
        } finally {
            await browser.close();
        }
    }
}
