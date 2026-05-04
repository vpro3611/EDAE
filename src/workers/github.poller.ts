import { Octokit } from '@octokit/rest';
import { TemplateVars } from '../modules/notification/notification.template';

export type PollResult = {
    initialized: boolean;
    newLastSeen: Record<string, unknown>;
    events: TemplateVars[];
};

const BOOTSTRAP_MARKER = '__bootstrapped';

export class GithubPollerService {
    static create(): GithubPollerService {
        return new GithubPollerService();
    }

    private isBootstrapped(lastSeen: Record<string, unknown>): boolean {
        return lastSeen[BOOTSTRAP_MARKER] === true;
    }

    private withBootstrap(lastSeen: Record<string, unknown>, extra: Record<string, unknown> = {}): Record<string, unknown> {
        return {
            ...lastSeen,
            ...extra,
            [BOOTSTRAP_MARKER]: true,
        };
    }

    async pollNewRelease(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        const { data } = await octokit.rest.repos.listReleases({ owner, repo, per_page: 10 });
        if (!data.length) return { initialized: !this.isBootstrapped(lastSeen), newLastSeen: this.withBootstrap(lastSeen), events: [] };

        const latestId = data[0].id;
        const newLastSeen = this.withBootstrap(lastSeen, { latest_release_id: latestId });
        if (lastSeen['latest_release_id'] === undefined && !this.isBootstrapped(lastSeen)) return { initialized: true, newLastSeen, events: [] };
        if (latestId === lastSeen['latest_release_id']) return { initialized: false, newLastSeen, events: [] };

        const seenIdx = data.findIndex(r => r.id === lastSeen['latest_release_id']);
        const newReleases = seenIdx === -1 ? [data[0]] : data.slice(0, seenIdx);

        return {
            initialized: false,
            newLastSeen,
            events: newReleases.map(r => ({
                repo: `${owner}/${repo}`,
                tag_name: r.tag_name,
                name: r.name ?? r.tag_name,
                url: r.html_url,
            })),
        };
    }

    async pollNewCommit(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        const { data } = await octokit.rest.repos.listCommits({ owner, repo, per_page: 20 });
        if (!data.length) return { initialized: !this.isBootstrapped(lastSeen), newLastSeen: this.withBootstrap(lastSeen), events: [] };

        const latestSha = data[0].sha;
        const newLastSeen = this.withBootstrap(lastSeen, { sha: latestSha });
        if (lastSeen['sha'] === undefined && !this.isBootstrapped(lastSeen)) return { initialized: true, newLastSeen, events: [] };
        if (latestSha === lastSeen['sha']) return { initialized: false, newLastSeen, events: [] };

        const seenIdx = data.findIndex(c => c.sha === lastSeen['sha']);
        const newCommits = seenIdx === -1 ? [data[0]] : data.slice(0, seenIdx);

        return {
            initialized: false,
            newLastSeen,
            events: newCommits.map(c => ({
                repo: `${owner}/${repo}`,
                sha: c.sha.slice(0, 7),
                message: c.commit.message.split('\n')[0],
                author: c.commit.author?.name ?? 'unknown',
                url: c.html_url,
            })),
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
        const newLastSeen = this.withBootstrap(lastSeen, { branches: names });

        if (!seenBranches.length && !this.isBootstrapped(lastSeen)) return { initialized: true, newLastSeen, events: [] };

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
        const newLastSeen = this.withBootstrap(lastSeen, { tags: names });

        if (!seenTags.length && !this.isBootstrapped(lastSeen)) return { initialized: true, newLastSeen, events: [] };

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
        // state:'all' so we catch issues opened and closed before the next poll
        const { data } = await octokit.rest.issues.listForRepo({
            owner, repo, state: 'all', per_page: 20, sort: 'created', direction: 'desc',
        });
        const issues = data.filter(i => !i.pull_request);
        if (!issues.length) return { initialized: !this.isBootstrapped(lastSeen), newLastSeen: this.withBootstrap(lastSeen), events: [] };

        const latestId = issues[0].id;
        const newLastSeen = this.withBootstrap(lastSeen, { latest_issue_id: latestId });
        if (lastSeen['latest_issue_id'] === undefined && !this.isBootstrapped(lastSeen)) return { initialized: true, newLastSeen, events: [] };
        if (latestId === lastSeen['latest_issue_id']) return { initialized: false, newLastSeen, events: [] };

        const seenIdx = issues.findIndex(i => i.id === lastSeen['latest_issue_id']);
        const newIssues = seenIdx === -1 ? [issues[0]] : issues.slice(0, seenIdx);

        return {
            initialized: false,
            newLastSeen,
            events: newIssues.map(i => ({
                repo: `${owner}/${repo}`,
                title: i.title,
                number: i.number,
                url: i.html_url,
            })),
        };
    }

    async pollIssueClosed(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        const since = lastSeen['last_closed_at'] as string | undefined;
        const now = new Date().toISOString();

        if (!since) {
            return {
                initialized: !this.isBootstrapped(lastSeen),
                newLastSeen: this.withBootstrap(lastSeen, { last_closed_at: now }),
                events: [],
            };
        }

        // `since` filters by updated_at; we then filter by closed_at to avoid false positives
        const { data } = await octokit.rest.issues.listForRepo({
            owner, repo, state: 'closed', since, per_page: 20, sort: 'updated', direction: 'desc',
        });
        const issues = data.filter(i => !i.pull_request && !!i.closed_at && i.closed_at > since);

        return {
            initialized: false,
            newLastSeen: this.withBootstrap(lastSeen, { last_closed_at: now }),
            events: issues.map(i => ({
                repo: `${owner}/${repo}`,
                title: i.title,
                number: i.number,
                url: i.html_url,
            })),
        };
    }

    async pollPrOpened(
        octokit: Octokit,
        owner: string,
        repo: string,
        lastSeen: Record<string, unknown>,
    ): Promise<PollResult> {
        // state:'all' so we catch PRs opened and merged/closed before the next poll
        const { data } = await octokit.rest.pulls.list({
            owner, repo, state: 'all', per_page: 20, sort: 'created', direction: 'desc',
        });
        if (!data.length) return { initialized: !this.isBootstrapped(lastSeen), newLastSeen: this.withBootstrap(lastSeen), events: [] };

        const latestId = data[0].id;
        const newLastSeen = this.withBootstrap(lastSeen, { latest_pr_id: latestId });
        if (lastSeen['latest_pr_id'] === undefined && !this.isBootstrapped(lastSeen)) return { initialized: true, newLastSeen, events: [] };
        if (latestId === lastSeen['latest_pr_id']) return { initialized: false, newLastSeen, events: [] };

        const seenIdx = data.findIndex(p => p.id === lastSeen['latest_pr_id']);
        const newPrs = seenIdx === -1 ? [data[0]] : data.slice(0, seenIdx);

        return {
            initialized: false,
            newLastSeen,
            events: newPrs.map(p => ({
                repo: `${owner}/${repo}`,
                title: p.title,
                number: p.number,
                url: p.html_url,
            })),
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
        if (!merged.length) return { initialized: !this.isBootstrapped(lastSeen), newLastSeen: this.withBootstrap(lastSeen), events: [] };

        const seenIds: number[] = (lastSeen['merged_pr_ids'] as number[] | undefined) ?? [];
        const allIds = merged.map(p => p.id);
        const newLastSeen = this.withBootstrap(lastSeen, { merged_pr_ids: allIds });

        if (!seenIds.length && !this.isBootstrapped(lastSeen)) return { initialized: true, newLastSeen, events: [] };

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
        const params: any = { owner, repo, status: 'completed', per_page: 10 };
        if (config['workflow_id']) params.workflow_id = String(config['workflow_id']);

        const { data } = await octokit.rest.actions.listWorkflowRunsForRepo(params);
        if (!data.workflow_runs.length) return { initialized: !this.isBootstrapped(lastSeen), newLastSeen: this.withBootstrap(lastSeen), events: [] };

        const latestId = data.workflow_runs[0].id;
        const newLastSeen = this.withBootstrap(lastSeen, { latest_run_id: latestId });
        if (lastSeen['latest_run_id'] === undefined && !this.isBootstrapped(lastSeen)) return { initialized: true, newLastSeen, events: [] };
        if (latestId === lastSeen['latest_run_id']) return { initialized: false, newLastSeen, events: [] };

        const seenIdx = data.workflow_runs.findIndex(r => r.id === lastSeen['latest_run_id']);
        const newRuns = seenIdx === -1 ? [data.workflow_runs[0]] : data.workflow_runs.slice(0, seenIdx);

        return {
            initialized: false,
            newLastSeen,
            events: newRuns.map(r => ({
                repo: `${owner}/${repo}`,
                workflow: r.name ?? r.display_title,
                conclusion: r.conclusion ?? 'unknown',
                url: r.html_url,
            })),
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
        const newLastSeen = this.withBootstrap(lastSeen, { stars });

        if (seenStars === undefined && !this.isBootstrapped(lastSeen)) return { initialized: true, newLastSeen, events: [] };

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
        const newLastSeen = this.withBootstrap(lastSeen, { forks });

        if (seenForks === undefined && !this.isBootstrapped(lastSeen)) return { initialized: true, newLastSeen, events: [] };

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
