import { Octokit } from '@octokit/rest';
import { TemplateVars } from '../modules/notification/notification.template';

export type PollResult = {
    initialized: boolean;
    newLastSeen: Record<string, unknown>;
    events: TemplateVars[];
};

export class GithubPollerService {
    static create(): GithubPollerService {
        return new GithubPollerService();
    }

    async pollNewRelease(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        const { data } = await octokit.rest.repos.getLatestRelease({ owner, repo }).catch(() => ({ data: null }));
        if (!data) return { initialized: true, newLastSeen: {}, events: [] };

        const seenId = lastSeen['latest_release_id'];
        const newLastSeen = { latest_release_id: data.id };
        if (seenId === undefined) return { initialized: true, newLastSeen, events: [] };
        if (data.id === seenId) return { initialized: false, newLastSeen, events: [] };

        return {
            initialized: false,
            newLastSeen,
            events: [{ repo: `${owner}/${repo}`, tag_name: data.tag_name, name: data.name ?? data.tag_name, url: data.html_url }],
        };
    }

    async pollNewCommit(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        const { data } = await octokit.rest.repos.listCommits({ owner, repo, per_page: 1 });
        if (!data.length) return { initialized: true, newLastSeen: {}, events: [] };

        const latestSha = data[0].sha;
        const newLastSeen = { sha: latestSha };
        if (lastSeen['sha'] === undefined) return { initialized: true, newLastSeen, events: [] };
        if (latestSha === lastSeen['sha']) return { initialized: false, newLastSeen, events: [] };

        const commit = data[0].commit;
        return {
            initialized: false,
            newLastSeen,
            events: [{
                repo: `${owner}/${repo}`,
                sha: latestSha.slice(0, 7),
                message: commit.message.split('\n')[0],
                author: commit.author?.name ?? 'unknown',
                url: data[0].html_url,
            }],
        };
    }

    async pollNewBranch(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        // per_page 100 is the GitHub API max; repos with >100 branches are not fully tracked
        const { data } = await octokit.rest.repos.listBranches({ owner, repo, per_page: 100 });
        const names = data.map(b => b.name);
        const seenBranches: string[] = (lastSeen['branches'] as string[] | undefined) ?? [];
        const newLastSeen = { branches: names };

        if (!seenBranches.length) return { initialized: true, newLastSeen, events: [] };

        const newBranches = names.filter(n => !seenBranches.includes(n));
        return {
            initialized: false,
            newLastSeen,
            events: newBranches.map(name => ({ repo: `${owner}/${repo}`, branch: name })),
        };
    }

    async pollNewTag(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        // per_page 100 is the GitHub API max; repos with >100 tags are not fully tracked
        const { data } = await octokit.rest.repos.listTags({ owner, repo, per_page: 100 });
        const names = data.map(t => t.name);
        const seenTags: string[] = (lastSeen['tags'] as string[] | undefined) ?? [];
        const newLastSeen = { tags: names };

        if (!seenTags.length) return { initialized: true, newLastSeen, events: [] };

        const newTags = names.filter(n => !seenTags.includes(n));
        return {
            initialized: false,
            newLastSeen,
            events: newTags.map(name => ({ repo: `${owner}/${repo}`, tag: name })),
        };
    }

    async pollIssueOpened(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        const { data } = await octokit.rest.issues.listForRepo({ owner, repo, state: 'open', per_page: 1, sort: 'created', direction: 'desc' });
        const issues = data.filter(i => !i.pull_request);
        if (!issues.length) return { initialized: true, newLastSeen: {}, events: [] };

        const latestId = issues[0].id;
        const newLastSeen = { latest_issue_id: latestId };
        if (lastSeen['latest_issue_id'] === undefined) return { initialized: true, newLastSeen, events: [] };
        if (latestId === lastSeen['latest_issue_id']) return { initialized: false, newLastSeen, events: [] };

        return {
            initialized: false,
            newLastSeen,
            events: [{ repo: `${owner}/${repo}`, title: issues[0].title, number: issues[0].number, url: issues[0].html_url }],
        };
    }

    async pollIssueClosed(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        const { data } = await octokit.rest.issues.listForRepo({ owner, repo, state: 'closed', per_page: 1, sort: 'created', direction: 'desc' });
        const issues = data.filter(i => !i.pull_request);
        if (!issues.length) return { initialized: true, newLastSeen: {}, events: [] };

        const latestId = issues[0].id;
        const newLastSeen = { latest_closed_issue_id: latestId };
        if (lastSeen['latest_closed_issue_id'] === undefined) return { initialized: true, newLastSeen, events: [] };
        if (latestId === lastSeen['latest_closed_issue_id']) return { initialized: false, newLastSeen, events: [] };

        return {
            initialized: false,
            newLastSeen,
            events: [{ repo: `${owner}/${repo}`, title: issues[0].title, number: issues[0].number, url: issues[0].html_url }],
        };
    }

    async pollPrOpened(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        const { data } = await octokit.rest.pulls.list({ owner, repo, state: 'open', per_page: 1, sort: 'created', direction: 'desc' });
        if (!data.length) return { initialized: true, newLastSeen: {}, events: [] };

        const latestId = data[0].id;
        const newLastSeen = { latest_pr_id: latestId };
        if (lastSeen['latest_pr_id'] === undefined) return { initialized: true, newLastSeen, events: [] };
        if (latestId === lastSeen['latest_pr_id']) return { initialized: false, newLastSeen, events: [] };

        return {
            initialized: false,
            newLastSeen,
            events: [{ repo: `${owner}/${repo}`, title: data[0].title, number: data[0].number, url: data[0].html_url }],
        };
    }

    async pollPrMerged(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        const { data } = await octokit.rest.pulls.list({ owner, repo, state: 'closed', per_page: 20, sort: 'updated', direction: 'desc' });
        const merged = data.filter(p => p.merged_at);
        if (!merged.length) return { initialized: true, newLastSeen: {}, events: [] };

        const seenIds: number[] = (lastSeen['merged_pr_ids'] as number[] | undefined) ?? [];
        const allIds = merged.map(p => p.id);
        const newLastSeen = { merged_pr_ids: allIds };

        if (!seenIds.length) return { initialized: true, newLastSeen, events: [] };

        const newPrs = merged.filter(p => !seenIds.includes(p.id));
        return {
            initialized: false,
            newLastSeen,
            events: newPrs.map(p => ({ repo: `${owner}/${repo}`, title: p.title, number: p.number, url: p.html_url })),
        };
    }

    async pollWorkflowCompleted(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
        config: Record<string, unknown>,
    ): Promise<PollResult> {
        const params: any = { owner, repo, status: 'completed', per_page: 1 };
        if (config['workflow_id']) params.workflow_id = config['workflow_id'];

        const { data } = await octokit.rest.actions.listWorkflowRunsForRepo(params);
        if (!data.workflow_runs.length) return { initialized: true, newLastSeen: {}, events: [] };

        const run = data.workflow_runs[0];
        const newLastSeen = { latest_run_id: run.id };
        if (lastSeen['latest_run_id'] === undefined) return { initialized: true, newLastSeen, events: [] };
        if (run.id === lastSeen['latest_run_id']) return { initialized: false, newLastSeen, events: [] };

        return {
            initialized: false,
            newLastSeen,
            events: [{
                repo: `${owner}/${repo}`,
                workflow: run.name ?? run.display_title,
                conclusion: run.conclusion ?? 'unknown',
                url: run.html_url,
            }],
        };
    }

    async pollStarMilestone(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
        config: Record<string, unknown>,
    ): Promise<PollResult> {
        const { data } = await octokit.rest.repos.get({ owner, repo });
        const stars = data.stargazers_count;
        const milestone = Number(config['milestone'] ?? 100);

        const seenStars = lastSeen['stars'] as number | undefined;
        const newLastSeen = { stars };

        if (seenStars === undefined) return { initialized: true, newLastSeen, events: [] };

        if (seenStars < milestone && stars >= milestone) {
            return {
                initialized: false,
                newLastSeen,
                events: [{ repo: `${owner}/${repo}`, stars, milestone }],
            };
        }

        return { initialized: false, newLastSeen, events: [] };
    }

    async pollForkMilestone(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
        config: Record<string, unknown>,
    ): Promise<PollResult> {
        const { data } = await octokit.rest.repos.get({ owner, repo });
        const forks = data.forks_count;
        const milestone = Number(config['milestone'] ?? 10);

        const seenForks = lastSeen['forks'] as number | undefined;
        const newLastSeen = { forks };

        if (seenForks === undefined) return { initialized: true, newLastSeen, events: [] };

        if (seenForks < milestone && forks >= milestone) {
            return {
                initialized: false,
                newLastSeen,
                events: [{ repo: `${owner}/${repo}`, forks, milestone }],
            };
        }

        return { initialized: false, newLastSeen, events: [] };
    }
}
