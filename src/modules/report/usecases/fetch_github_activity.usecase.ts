import { Octokit } from '@octokit/rest';
import { GithubSource } from '../../github_source/entity/github_source';
import { GithubSourceRepoReaderInterface } from '../../github_source/interfaces/interface.repository';

export type CommitActivity        = { sha: string; message: string; author: string; date: string };
export type PullRequestActivity   = { number: number; title: string; state: 'open' | 'closed' | 'merged'; created_at: string };
export type ReleaseActivity       = { tag_name: string; name: string; published_at: string; url: string };
export type IssueActivity         = { number: number; title: string; created_at: string; url: string };
export type ClosedIssueActivity   = { number: number; title: string; closed_at: string; url: string };
export type WorkflowRunActivity   = { name: string; conclusion: string; created_at: string; url: string };

export type RepoActivity = {
    source: GithubSource;
    stars: number;
    forks: number;
    commits: CommitActivity[];
    pullRequests: PullRequestActivity[];
    releases: ReleaseActivity[];
    issuesOpened: IssueActivity[];
    issuesClosed: ClosedIssueActivity[];
    workflowRuns: WorkflowRunActivity[];
};

export class FetchGithubActivityUseCase {
    private constructor(private readonly sourceReader: GithubSourceRepoReaderInterface) {}

    static create(sourceReader: GithubSourceRepoReaderInterface): FetchGithubActivityUseCase {
        return new FetchGithubActivityUseCase(sourceReader);
    }

    async execute(userId: string, since: Date): Promise<RepoActivity[]> {
        const sources = await this.sourceReader.getSourcesByUserId(userId);
        return Promise.all(sources.map(s => this.fetchSource(s, since)));
    }

    private async fetchSource(source: GithubSource, since: Date): Promise<RepoActivity> {
        const octokit = new Octokit({ auth: source.access_token ?? undefined });
        const owner = source.repo_owner;
        const repo  = source.repo_name;

        const [
            repoResult,
            commitsResult,
            pullsResult,
            releasesResult,
            issuesResult,
            workflowResult,
        ] = await Promise.allSettled([
            octokit.repos.get({ owner, repo }),
            octokit.repos.listCommits({ owner, repo, since: since.toISOString(), per_page: 100 }),
            octokit.pulls.list({ owner, repo, state: 'all', sort: 'created', direction: 'desc', per_page: 50 }),
            octokit.repos.listReleases({ owner, repo, per_page: 20 }),
            octokit.issues.listForRepo({ owner, repo, state: 'all', per_page: 50, sort: 'created', direction: 'desc' }),
            octokit.actions.listWorkflowRunsForRepo({ owner, repo, status: 'completed', per_page: 20 }),
        ]);

        const stars = repoResult.status === 'fulfilled' ? (repoResult.value.data.stargazers_count ?? 0) : 0;
        const forks = repoResult.status === 'fulfilled' ? (repoResult.value.data.forks_count ?? 0) : 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const commits: CommitActivity[] = commitsResult.status === 'fulfilled'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? commitsResult.value.data.map((c: any) => ({
                  sha: (c.sha as string).slice(0, 7),
                  message: (c.commit.message as string).split('\n')[0],
                  author: (c.commit.author?.name as string | undefined) ?? '',
                  date: (c.commit.author?.date as string | undefined) ?? '',
              }))
            : [];

        const pullRequests: PullRequestActivity[] = pullsResult.status === 'fulfilled'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? pullsResult.value.data.filter((pr: any) => new Date(pr.created_at) >= since)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((pr: any) => ({
                      number: pr.number,
                      title: pr.title,
                      state: (pr.merged_at ? 'merged' : pr.state) as 'open' | 'closed' | 'merged',
                      created_at: pr.created_at,
                  }))
            : [];

        const releases: ReleaseActivity[] = releasesResult.status === 'fulfilled'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? releasesResult.value.data.filter((r: any) => r.published_at && new Date(r.published_at) >= since)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((r: any) => ({
                      tag_name: r.tag_name,
                      name: r.name || r.tag_name,
                      published_at: r.published_at,
                      url: r.html_url,
                  }))
            : [];

        // Filter out PRs from the issues list, split by opened vs closed in period
        const allIssues = issuesResult.status === 'fulfilled'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? issuesResult.value.data.filter((i: any) => !i.pull_request)
            : [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const issuesOpened: IssueActivity[] = allIssues.filter((i: any) => new Date(i.created_at) >= since)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((i: any) => ({ number: i.number, title: i.title, created_at: i.created_at, url: i.html_url }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const issuesClosed: ClosedIssueActivity[] = allIssues.filter((i: any) => i.closed_at && new Date(i.closed_at) >= since)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((i: any) => ({ number: i.number, title: i.title, closed_at: i.closed_at, url: i.html_url }));

        const workflowRuns: WorkflowRunActivity[] = workflowResult.status === 'fulfilled'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? workflowResult.value.data.workflow_runs.filter((r: any) => new Date(r.created_at) >= since)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((r: any) => ({
                      name: r.name ?? r.display_title,
                      conclusion: r.conclusion ?? 'unknown',
                      created_at: r.created_at,
                      url: r.html_url,
                  }))
            : [];

        return { source, stars, forks, commits, pullRequests, releases, issuesOpened, issuesClosed, workflowRuns };
    }
}
