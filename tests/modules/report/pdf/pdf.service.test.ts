import { PdfService, ReportTemplateData } from '../../../../src/modules/report/pdf/pdf.service';

jest.mock('puppeteer', () => ({
    launch: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
            setContent: jest.fn().mockResolvedValue(undefined),
            pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-mock')),
        }),
        close: jest.fn().mockResolvedValue(undefined),
    }),
}));

const SAMPLE: ReportTemplateData = {
    periodStart: '2026-04-29',
    periodEnd: '2026-05-06',
    totalCommits: 1,
    totalPRs: 1,
    totalReleases: 1,
    totalIssuesOpened: 1,
    totalIssuesClosed: 0,
    totalWorkflowRuns: 1,
    repoCount: 1,
    repos: [{
        owner: 'alice',
        name: 'app',
        stars: 42,
        forks: 5,
        commits: [{ sha: 'abc1234', message: 'feat: add login', author: 'Alice', date: '2026-05-01' }],
        pullRequests: [{ number: 7, title: 'Add auth', state: 'open', created_at: '2026-04-30' }],
        releases: [{ tag_name: 'v1.2.0', name: 'v1.2.0', published_at: '2026-05-02', url: 'https://github.com/alice/app/releases/v1.2.0' }],
        issuesOpened: [{ number: 12, title: 'Bug: crash on startup', created_at: '2026-04-30', url: 'https://github.com/alice/app/issues/12' }],
        issuesClosed: [],
        workflowRuns: [{ name: 'CI', conclusion: 'success', created_at: '2026-05-01', url: 'https://github.com/alice/app/actions/runs/1' }],
    }],
};

describe('PdfService', () => {
    it('returns a Buffer', async () => {
        const result = await PdfService.create().generatePdf(SAMPLE);
        expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('launches puppeteer with --no-sandbox', async () => {
        const puppeteer = require('puppeteer');
        await PdfService.create().generatePdf(SAMPLE);
        expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({ args: expect.arrayContaining(['--no-sandbox']) }),
        );
    });

    it('closes the browser even when pdf generation throws', async () => {
        const puppeteer = require('puppeteer');
        puppeteer.launch.mockClear();
        const mockPage = { setContent: jest.fn().mockResolvedValue(undefined), pdf: jest.fn().mockRejectedValueOnce(new Error('render fail')) };
        const mockBrowser = { newPage: jest.fn().mockResolvedValue(mockPage), close: jest.fn().mockResolvedValue(undefined) };
        puppeteer.launch.mockResolvedValueOnce(mockBrowser);

        await expect(PdfService.create().generatePdf(SAMPLE)).rejects.toThrow('render fail');
        expect(mockBrowser.close).toHaveBeenCalled();
    });
});
