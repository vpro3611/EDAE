import { GithubPollerService } from '../../src/workers/github.poller';
import { Octokit } from '@octokit/rest';

const OWNER = 'org';
const REPO = 'repo';

function makeOctokit(overrides: {
  getLatestRelease?: jest.Mock;
  listReleases?: jest.Mock;
  listCommits?: jest.Mock;
  listBranches?: jest.Mock;
  listTags?: jest.Mock;
  listForRepo?: jest.Mock;
  pullsList?: jest.Mock;
  listWorkflowRunsForRepo?: jest.Mock;
  reposGet?: jest.Mock;
} = {}): Octokit {
  return {
    rest: {
      repos: {
        getLatestRelease: overrides.getLatestRelease ?? jest.fn(),
        listReleases: overrides.listReleases ?? jest.fn(),
        listCommits: overrides.listCommits ?? jest.fn(),
        listBranches: overrides.listBranches ?? jest.fn(),
        listTags: overrides.listTags ?? jest.fn(),
        get: overrides.reposGet ?? jest.fn(),
      },
      issues: { listForRepo: overrides.listForRepo ?? jest.fn() },
      pulls: { list: overrides.pullsList ?? jest.fn() },
      actions: { listWorkflowRunsForRepo: overrides.listWorkflowRunsForRepo ?? jest.fn() },
    },
  } as unknown as Octokit;
}

describe('GithubPollerService', () => {
  let service: GithubPollerService;

  beforeEach(() => {
    service = GithubPollerService.create();
  });

  // ── pollNewRelease ──────────────────────────────────────────────────────────

  describe('pollNewRelease', () => {
    it('returns initialized=true and records state when no releases exist yet', async () => {
      const octokit = makeOctokit({
        listReleases: jest.fn().mockResolvedValue({ data: [] }),
      });
      const result = await service.pollNewRelease(octokit, OWNER, REPO, {});
      expect(result.initialized).toBe(true);
      expect(result.events).toHaveLength(0);
    });

    it('returns initialized=true on first poll when releases exist (no lastSeen)', async () => {
      const octokit = makeOctokit({
        listReleases: jest.fn().mockResolvedValue({
          data: [{ id: 1, tag_name: 'v1.0', name: 'v1.0', html_url: 'url1' }],
        }),
      });
      const result = await service.pollNewRelease(octokit, OWNER, REPO, {});
      expect(result.initialized).toBe(true);
      expect(result.events).toHaveLength(0);
      expect(result.newLastSeen).toEqual({ __bootstrapped: true, latest_release_id: 1 });
    });

    it('notifies when the first release appears after an empty repo was already bootstrapped', async () => {
      const octokit = makeOctokit({
        listReleases: jest.fn().mockResolvedValue({
          data: [{ id: 1, tag_name: 'v1.0', name: 'v1.0', html_url: 'url1' }],
        }),
      });
      const result = await service.pollNewRelease(octokit, OWNER, REPO, { __bootstrapped: true });
      expect(result.initialized).toBe(false);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({ tag_name: 'v1.0' });
      expect(result.newLastSeen).toEqual({ __bootstrapped: true, latest_release_id: 1 });
    });

    it('returns no events when the latest release has not changed', async () => {
      const octokit = makeOctokit({
        listReleases: jest.fn().mockResolvedValue({
          data: [{ id: 10, tag_name: 'v1.0', name: 'v1.0', html_url: 'url1' }],
        }),
      });
      const result = await service.pollNewRelease(octokit, OWNER, REPO, { latest_release_id: 10 });
      expect(result.events).toHaveLength(0);
    });

    it('returns events for all new releases published between polls', async () => {
      const octokit = makeOctokit({
        listReleases: jest.fn().mockResolvedValue({
          data: [
            { id: 30, tag_name: 'v3.0', name: 'v3.0', html_url: 'url-v3' },
            { id: 20, tag_name: 'v2.0', name: 'v2.0', html_url: 'url-v2' },
            { id: 10, tag_name: 'v1.0', name: 'v1.0', html_url: 'url-v1' },
          ],
        }),
      });
      const result = await service.pollNewRelease(octokit, OWNER, REPO, { latest_release_id: 10 });
      expect(result.initialized).toBe(false);
      expect(result.events).toHaveLength(2);
      expect(result.events[0]).toMatchObject({ tag_name: 'v3.0' });
      expect(result.events[1]).toMatchObject({ tag_name: 'v2.0' });
      expect(result.newLastSeen).toEqual({ latest_release_id: 30, __bootstrapped: true });
    });
  });

  // ── pollNewCommit ───────────────────────────────────────────────────────────

  describe('pollNewCommit', () => {
    it('returns initialized=true on first poll', async () => {
      const octokit = makeOctokit({
        listCommits: jest.fn().mockResolvedValue({
          data: [{ sha: 'abc', commit: { message: 'init', author: { name: 'dev' } }, html_url: 'url' }],
        }),
      });
      const result = await service.pollNewCommit(octokit, OWNER, REPO, {});
      expect(result.initialized).toBe(true);
      expect(result.events).toHaveLength(0);
    });

    it('returns no events when latest SHA has not changed', async () => {
      const octokit = makeOctokit({
        listCommits: jest.fn().mockResolvedValue({
          data: [{ sha: 'sha1', commit: { message: 'msg', author: { name: 'dev' } }, html_url: 'url' }],
        }),
      });
      const result = await service.pollNewCommit(octokit, OWNER, REPO, { sha: 'sha1' });
      expect(result.events).toHaveLength(0);
    });

    it('returns events for all commits pushed between polls', async () => {
      const octokit = makeOctokit({
        listCommits: jest.fn().mockResolvedValue({
          data: [
            { sha: 'sha3', commit: { message: 'C', author: { name: 'dev' } }, html_url: 'url3' },
            { sha: 'sha2', commit: { message: 'B', author: { name: 'dev' } }, html_url: 'url2' },
            { sha: 'sha1', commit: { message: 'A', author: { name: 'dev' } }, html_url: 'url1' },
          ],
        }),
      });
      const result = await service.pollNewCommit(octokit, OWNER, REPO, { sha: 'sha1' });
      expect(result.initialized).toBe(false);
      expect(result.events).toHaveLength(2);
      expect(result.events[0]).toMatchObject({ sha: 'sha3' });
      expect(result.events[1]).toMatchObject({ sha: 'sha2' });
    });
  });

  // ── pollIssueOpened ─────────────────────────────────────────────────────────

  describe('pollIssueOpened', () => {
    it('returns initialized=true on first poll', async () => {
      const octokit = makeOctokit({
        listForRepo: jest.fn().mockResolvedValue({
          data: [{ id: 100, number: 1, title: 'T', html_url: 'url', pull_request: undefined }],
        }),
      });
      const result = await service.pollIssueOpened(octokit, OWNER, REPO, {});
      expect(result.initialized).toBe(true);
      expect(result.events).toHaveLength(0);
    });

    it('detects an issue that was opened and closed before the next poll', async () => {
      // The real GitHub API returns nothing for state:'open' once the issue is closed.
      // The fix queries state:'all' so these are never missed.
      const listForRepo = jest.fn().mockImplementation(({ state }) => {
        if (state === 'all') {
          return Promise.resolve({
            data: [{ id: 200, number: 42, title: 'Urgent fix', html_url: 'url42', pull_request: undefined }],
          });
        }
        return Promise.resolve({ data: [] }); // state:'open' — issue is already closed
      });
      const result = await service.pollIssueOpened(makeOctokit({ listForRepo }), OWNER, REPO, { latest_issue_id: 100 });
      expect(result.initialized).toBe(false);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({ number: 42 });
    });

    it('returns events for all new issues opened between polls', async () => {
      const octokit = makeOctokit({
        listForRepo: jest.fn().mockResolvedValue({
          data: [
            { id: 300, number: 30, title: 'C', html_url: 'url30', pull_request: undefined },
            { id: 200, number: 20, title: 'B', html_url: 'url20', pull_request: undefined },
            { id: 100, number: 10, title: 'A', html_url: 'url10', pull_request: undefined },
          ],
        }),
      });
      const result = await service.pollIssueOpened(octokit, OWNER, REPO, { latest_issue_id: 100 });
      expect(result.events).toHaveLength(2);
      expect(result.events[0]).toMatchObject({ number: 30 });
      expect(result.events[1]).toMatchObject({ number: 20 });
    });

    it('filters out pull requests from issue results', async () => {
      const octokit = makeOctokit({
        listForRepo: jest.fn().mockResolvedValue({
          data: [
            { id: 200, number: 20, title: 'PR', html_url: 'url20', pull_request: { url: 'pr-url' } },
            { id: 150, number: 15, title: 'Issue', html_url: 'url15', pull_request: undefined },
            { id: 100, number: 10, title: 'Old', html_url: 'url10', pull_request: undefined },
          ],
        }),
      });
      const result = await service.pollIssueOpened(octokit, OWNER, REPO, { latest_issue_id: 100 });
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({ number: 15 });
    });
  });

  // ── pollIssueClosed ─────────────────────────────────────────────────────────

  describe('pollIssueClosed', () => {
    it('returns initialized=true and stores a timestamp on first poll', async () => {
      const octokit = makeOctokit({ listForRepo: jest.fn().mockResolvedValue({ data: [] }) });
      const before = new Date().toISOString();
      const result = await service.pollIssueClosed(octokit, OWNER, REPO, {});
      const after = new Date().toISOString();
      expect(result.initialized).toBe(true);
      expect(result.events).toHaveLength(0);
      expect(result.newLastSeen.last_closed_at as string >= before).toBe(true);
      expect(result.newLastSeen.last_closed_at as string <= after).toBe(true);
      expect(result.newLastSeen.__bootstrapped).toBe(true);
    });

    it('detects multiple issues closed in one poll interval', async () => {
      const since = '2024-01-01T00:00:00.000Z';
      const octokit = makeOctokit({
        listForRepo: jest.fn().mockResolvedValue({
          data: [
            { id: 5, number: 5, title: 'E', html_url: 'url5', closed_at: '2024-01-01T02:00:00.000Z', pull_request: undefined },
            { id: 4, number: 4, title: 'D', html_url: 'url4', closed_at: '2024-01-01T01:00:00.000Z', pull_request: undefined },
            { id: 3, number: 3, title: 'C', html_url: 'url3', closed_at: '2023-12-31T00:00:00.000Z', pull_request: undefined },
          ],
        }),
      });
      const result = await service.pollIssueClosed(octokit, OWNER, REPO, { last_closed_at: since });
      expect(result.initialized).toBe(false);
      expect(result.events).toHaveLength(2);
      expect(result.events.map(e => e['number'])).toContain(5);
      expect(result.events.map(e => e['number'])).toContain(4);
    });

    it('ignores issues that were updated but not closed after the checkpoint', async () => {
      const since = '2024-01-01T00:00:00.000Z';
      const octokit = makeOctokit({
        listForRepo: jest.fn().mockResolvedValue({
          data: [
            // closed_at is before since — was closed before our checkpoint
            { id: 1, number: 1, title: 'Old', html_url: 'url1', closed_at: '2023-06-01T00:00:00.000Z', pull_request: undefined },
          ],
        }),
      });
      const result = await service.pollIssueClosed(octokit, OWNER, REPO, { last_closed_at: since });
      expect(result.events).toHaveLength(0);
    });
  });

  // ── pollPrOpened ────────────────────────────────────────────────────────────

  describe('pollPrOpened', () => {
    it('returns initialized=true on first poll', async () => {
      const octokit = makeOctokit({
        pullsList: jest.fn().mockResolvedValue({
          data: [{ id: 100, number: 1, title: 'Init PR', html_url: 'url' }],
        }),
      });
      const result = await service.pollPrOpened(octokit, OWNER, REPO, {});
      expect(result.initialized).toBe(true);
      expect(result.events).toHaveLength(0);
    });

    it('detects a PR that was opened and merged before the next poll', async () => {
      const pullsList = jest.fn().mockImplementation(({ state }) => {
        if (state === 'all') {
          return Promise.resolve({
            data: [{ id: 500, number: 50, title: 'Feature X', html_url: 'url50', merged_at: '2024-01-01T01:00:00.000Z' }],
          });
        }
        return Promise.resolve({ data: [] }); // state:'open' — PR is already merged
      });
      const result = await service.pollPrOpened(makeOctokit({ pullsList }), OWNER, REPO, { latest_pr_id: 400 });
      expect(result.initialized).toBe(false);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({ number: 50 });
    });

    it('returns events for all PRs opened between polls', async () => {
      const octokit = makeOctokit({
        pullsList: jest.fn().mockResolvedValue({
          data: [
            { id: 600, number: 60, title: 'PR C', html_url: 'url60' },
            { id: 500, number: 50, title: 'PR B', html_url: 'url50' },
            { id: 400, number: 40, title: 'PR A', html_url: 'url40' },
          ],
        }),
      });
      const result = await service.pollPrOpened(octokit, OWNER, REPO, { latest_pr_id: 400 });
      expect(result.events).toHaveLength(2);
      expect(result.events[0]).toMatchObject({ number: 60 });
      expect(result.events[1]).toMatchObject({ number: 50 });
    });
  });

  // ── pollWorkflowCompleted ───────────────────────────────────────────────────

  describe('pollWorkflowCompleted', () => {
    it('returns initialized=true on first poll', async () => {
      const octokit = makeOctokit({
        listWorkflowRunsForRepo: jest.fn().mockResolvedValue({
          data: { workflow_runs: [{ id: 1, name: 'CI', display_title: 'CI', conclusion: 'success', html_url: 'url' }] },
        }),
      });
      const result = await service.pollWorkflowCompleted(octokit, OWNER, REPO, {}, {});
      expect(result.initialized).toBe(true);
      expect(result.events).toHaveLength(0);
    });

    it('returns no events when latest run has not changed', async () => {
      const octokit = makeOctokit({
        listWorkflowRunsForRepo: jest.fn().mockResolvedValue({
          data: { workflow_runs: [{ id: 100, name: 'CI', display_title: 'CI', conclusion: 'success', html_url: 'url' }] },
        }),
      });
      const result = await service.pollWorkflowCompleted(octokit, OWNER, REPO, { latest_run_id: 100 }, {});
      expect(result.events).toHaveLength(0);
    });

    it('returns events for all workflow completions between polls', async () => {
      const octokit = makeOctokit({
        listWorkflowRunsForRepo: jest.fn().mockResolvedValue({
          data: {
            workflow_runs: [
              { id: 300, name: 'CI', display_title: 'CI', conclusion: 'success', html_url: 'url3' },
              { id: 200, name: 'CI', display_title: 'CI', conclusion: 'failure', html_url: 'url2' },
              { id: 100, name: 'CI', display_title: 'CI', conclusion: 'success', html_url: 'url1' },
            ],
          },
        }),
      });
      const result = await service.pollWorkflowCompleted(octokit, OWNER, REPO, { latest_run_id: 100 }, {});
      expect(result.initialized).toBe(false);
      expect(result.events).toHaveLength(2);
      expect(result.events[0]).toMatchObject({ conclusion: 'success' });
      expect(result.events[1]).toMatchObject({ conclusion: 'failure' });
      expect(result.newLastSeen).toEqual({ latest_run_id: 300, __bootstrapped: true });
    });

    it('passes workflow_id config to the API when provided', async () => {
      const listWorkflowRunsForRepo = jest.fn().mockResolvedValue({ data: { workflow_runs: [] } });
      const octokit = makeOctokit({ listWorkflowRunsForRepo });
      await service.pollWorkflowCompleted(octokit, OWNER, REPO, {}, { workflow_id: 'deploy.yml' });
      expect(listWorkflowRunsForRepo).toHaveBeenCalledWith(
        expect.objectContaining({ workflow_id: 'deploy.yml' }),
      );
    });
  });

  describe('pollPrMerged', () => {
    it('notifies when the first merged PR appears after an empty merged history was already bootstrapped', async () => {
      const octokit = makeOctokit({
        pullsList: jest.fn().mockResolvedValue({
          data: [{ id: 700, number: 70, title: 'Merged PR', html_url: 'url70', merged_at: '2024-01-01T01:00:00.000Z' }],
        }),
      });
      const result = await service.pollPrMerged(octokit, OWNER, REPO, { __bootstrapped: true });
      expect(result.initialized).toBe(false);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({ number: 70 });
      expect(result.newLastSeen).toEqual({ __bootstrapped: true, merged_pr_ids: [700] });
    });
  });

  describe('pollNewTag', () => {
    it('notifies when the first tag appears after an empty repo was already bootstrapped', async () => {
      const octokit = makeOctokit({
        listTags: jest.fn().mockResolvedValue({
          data: [{ name: 'v1.0.0' }],
        }),
      });
      const result = await service.pollNewTag(octokit, OWNER, REPO, { __bootstrapped: true });
      expect(result.initialized).toBe(false);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({ tag: 'v1.0.0' });
      expect(result.newLastSeen).toEqual({ __bootstrapped: true, tags: ['v1.0.0'] });
    });
  });
});
