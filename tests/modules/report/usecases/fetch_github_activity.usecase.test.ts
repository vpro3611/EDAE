import { FetchGithubActivityUseCase } from '../../../../src/modules/report/usecases/fetch_github_activity.usecase';
import { GithubSourceRepoReaderInterface } from '../../../../src/modules/github_source/interfaces/interface.repository';
import { GithubSource } from '../../../../src/modules/github_source/entity/github_source';

jest.mock('@octokit/rest', () => ({
    Octokit: jest.fn().mockImplementation(() => ({
        repos: {
            get: jest.fn().mockResolvedValue({ data: { stargazers_count: 10, forks_count: 3 } }),
            listCommits: jest.fn().mockResolvedValue({
                data: [{ sha: 'abc1234567', commit: { message: 'feat: add feature\nbody', author: { name: 'Alice', date: '2026-05-01T10:00:00Z' } } }],
            }),
            listReleases: jest.fn().mockResolvedValue({
                data: [{ tag_name: 'v1.0.0', name: 'v1.0.0', published_at: '2026-05-01T10:00:00Z', html_url: 'https://github.com/alice/app/releases/v1.0.0' }],
            }),
        },
        pulls: {
            list: jest.fn().mockResolvedValue({
                data: [{ number: 42, title: 'Add auth', state: 'open', created_at: '2026-05-02T10:00:00Z', merged_at: null }],
            }),
        },
        issues: {
            listForRepo: jest.fn().mockResolvedValue({
                data: [
                    { number: 5, title: 'Bug fix', created_at: '2026-05-01T10:00:00Z', closed_at: null, html_url: 'https://github.com/alice/app/issues/5', pull_request: undefined },
                ],
            }),
        },
        actions: {
            listWorkflowRunsForRepo: jest.fn().mockResolvedValue({
                data: { workflow_runs: [{ name: 'CI', conclusion: 'success', created_at: '2026-05-01T10:00:00Z', html_url: 'https://github.com/alice/app/runs/1' }] },
            }),
        },
    })),
}));

function makeSource() {
    return GithubSource.restore('src-id','user-id','alice','my-app','token123',new Date(),new Date());
}

describe('FetchGithubActivityUseCase', () => {
    let sourceReader: jest.Mocked<GithubSourceRepoReaderInterface>;
    let useCase: FetchGithubActivityUseCase;

    beforeEach(() => {
        sourceReader = { getSourceById: jest.fn(), getSourcesByUserId: jest.fn() };
        useCase = FetchGithubActivityUseCase.create(sourceReader);
    });

    it('fetches commits, PRs, releases, issues and workflow runs for all user sources', async () => {
        sourceReader.getSourcesByUserId.mockResolvedValue([makeSource()]);
        const results = await useCase.execute('user-id', new Date('2026-04-29'));
        expect(results).toHaveLength(1);
        expect(results[0].commits[0].sha).toBe('abc1234');
        expect(results[0].commits[0].message).toBe('feat: add feature');
        expect(results[0].pullRequests[0].number).toBe(42);
        expect(results[0].releases[0].tag_name).toBe('v1.0.0');
        expect(results[0].issuesOpened[0].number).toBe(5);
        expect(results[0].workflowRuns[0].conclusion).toBe('success');
        expect(results[0].stars).toBe(10);
        expect(results[0].forks).toBe(3);
    });

    it('returns empty array when user has no sources', async () => {
        sourceReader.getSourcesByUserId.mockResolvedValue([]);
        expect(await useCase.execute('user-id', new Date())).toEqual([]);
    });

    it('filters out PRs created before since date', async () => {
        sourceReader.getSourcesByUserId.mockResolvedValue([makeSource()]);
        const futureDate = new Date('2026-05-03T00:00:00Z'); // after PR created_at
        const results = await useCase.execute('user-id', futureDate);
        expect(results[0].pullRequests).toHaveLength(0);
    });
});
