# GitHub Event Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a system allowing users to subscribe to GitHub events, receive notifications via configured channels, and manage these subscriptions.

**Architecture:** The system will leverage existing backend modules for GitHub source management, subscription handling, event polling, and notification dispatch. A frontend skill will manage the user interface for configuration and subscription management. Pre-defined templates will be used for notifications.

**Tech Stack:** TypeScript, Node.js, PostgreSQL, GitHub API (`@octokit/rest`), Telegram, Slack, Email.

---

## Task 1: Backend - Refine Polling and Subscription Logic (if needed)

Although the backend is largely in place, a quick review is prudent to ensure it fully supports the described feature and to identify any minor adjustments needed for configuration or data handling.

**Files:**
*   Modify: `src/workers/github.poll.worker.ts`
*   Modify: `src/modules/subscription/usecases/subscription.create.usecase.ts`
*   Modify: `src/modules/github_source/usecases/github_source.create.usecase.ts`
*   Test: `tests/workers/github.poll.worker.test.ts` (or create if none exists)

- [ ] **Step 1: Review `GithubPollWorker` for configuration options.**
    - Verify if `config` object in `SubscriptionWithSource` is sufficient for event-specific configurations (e.g., `workflow_id`, `milestone`).
    - If not, determine necessary changes to `Subscription` entity and its repository/use cases.
    - *Assume current config object is sufficient for now, pending frontend requirements.*

- [ ] **Step 2: Review `subscription.create.usecase.ts` and `github_source.create.usecase.ts` for handling new subscriptions and sources.**
    - Ensure they correctly store `event_type`, `message_template` (pre-defined), `config`, `connection_id`, etc.
    - If new fields are needed based on polling requirements, update entities, DTOs, mappers, and database migrations (if any).
    - *Assume current structures are sufficient.*

- [ ] **Step 3: Write a minimal test for `GithubPollWorker` to ensure a basic poll-and-dispatch cycle works.**
    - Mock `Octokit`, `GithubPollerService`, `NotificationDispatcher`, and database interactions.
    - Simulate a new event detection.
    - Verify that `NotificationDispatcher.dispatch` is called with the correct rendered message and credentials.

```typescript
// tests/workers/github.poll.worker.test.ts (example snippet)
import { GithubPollWorker } from '../../src/workers/github.poll.worker';
import { Octokit } from '@octokit/rest';
import { GithubPollerService, PollResult } from '../../src/workers/github.poller';
import { renderTemplate } from '../../src/modules/notification/notification.template';
import { NotificationDispatcher } from '../../src/modules/notification/notification.dispatcher';
import { Pool } from 'pg';
import { InfraEncryptionInterface } from '../../src/modules/infra/encryption/infra.encryption.interface';
import { SubscriptionWithSource } from '../../src/modules/subscription/subscription.worker_types';
import { ConnectionCredentials } from '../../src/modules/connection/connection.credentials';

describe('GithubPollWorker', () => {
    let worker: GithubPollWorker;
    let mockDb: Pool;
    let mockEncryption: InfraEncryptionInterface;
    let mockPoller: GithubPollerService;
    let mockDispatcher: NotificationDispatcher;
    let mockOctokit: Octokit;
    let mockSubscription: SubscriptionWithSource;
    let mockConnectionCredentials: ConnectionCredentials;

    beforeEach(() => {
        mockDb = {} as Pool;
        mockEncryption = {} as InfraEncryptionInterface;
        mockPoller = {
            poll: jest.fn(),
        } as unknown as GithubPollerService;
        mockDispatcher = {
            dispatch: jest.fn(),
        } as unknown as NotificationDispatcher;
        mockOctokit = {} as Octokit;

        worker = GithubPollWorker.create(mockDb, mockEncryption, mockPoller, mockDispatcher);

        // Mock a subscription and connection
        mockSubscription = {
            subscription_id: 'sub-1',
            user_id: 'user-1',
            connection_id: 'conn-1',
            repo_owner: 'owner',
            repo_name: 'repo',
            event_type: 'new_release',
            message_template: 'New release {{ tag_name }} for {{ repo }}',
            last_seen: { latest_release_id: 123 },
            config: {},
            access_token: 'mock-token',
            created_at: new Date(),
            updated_at: new Date(),
            repo_id: 456,
        };
        mockConnectionCredentials = {
            provider: 'email',
            address: 'test@example.com',
        } as ConnectionCredentials;

        // Mocking other dependencies that would be fetched
        jest.spyOn(worker as any, 'poll').mockResolvedValue({
            initialized: false,
            newLastSeen: { latest_release_id: 456 },
            events: [{ repo: 'owner/repo', tag_name: 'v1.0.0', name: 'Version 1.0.0', url: 'http://github.com/owner/repo/releases/v1.0.0' }],
        } as PollResult);
        jest.spyOn(worker as any, 'renderTemplate').mockReturnValue('New release v1.0.0 for owner/repo'); // Mocking renderTemplate if it were a method of worker
        jest.spyOn(require('../src/modules/connection/repository/repository.connection.reader'), 'RepositoryConnectionReader').mockImplementation(() => ({
            getConnectionById: jest.fn().mockResolvedValue({ credentials: mockConnectionCredentials })
        }));
        jest.spyOn(require('../src/modules/subscription/repository/repository.subscription.writer'), 'RepositorySubscriptionWriter').mockImplementation(() => ({
            updateLastSeen: jest.fn().mockResolvedValue(undefined)
        }));
    });

    it('should process a subscription and dispatch a notification', async () => {
        await worker.processSubscription(mockSubscription);

        expect(mockPoller.poll).toHaveBeenCalledWith(expect.any(Octokit), 'owner', 'repo', { latest_release_id: 123 });
        expect(require('../src/modules/subscription/repository/repository.subscription.writer').RepositorySubscriptionWriter.create(mockDb).updateLastSeen).toHaveBeenCalledWith('sub-1', { latest_release_id: 456 });
        expect(require('../src/modules/connection/repository/repository.connection.reader').RepositoryConnectionReader.create(mockDb, mockEncryption).getConnectionById).toHaveBeenCalledWith('conn-1');
        expect(mockDispatcher.dispatch).toHaveBeenCalledWith(mockConnectionCredentials, 'New release v1.0.0 for owner/repo');
    });

    // Add more tests for edge cases: no new events, poll failure, connection not found, dispatch failure, etc.
});
```

- [ ] **Step 4: Run tests to verify they fail initially (e.g., for missing implementations or correct mocks).**
    - Expected: Failures related to `GithubPollerService.poll` not being implemented as a standalone method, or issues with mock setup.
- [ ] **Step 5: Implement minimal code to make the test pass.**
    - This would involve ensuring `GithubPollerService.poll` is correctly wired or mocked, and `renderTemplate` is accessible/mocked correctly.
    - Add necessary imports and mocks.
- [ ] **Step 6: Run tests to verify they pass.**
- [ ] **Step 7: Commit**

```bash
git add src/workers/github.poll.worker.ts tests/workers/github.poll.worker.test.ts
git commit -m "test: add basic poll-dispatch cycle test for GithubPollWorker"
```

## Task 2: Frontend - Develop Subscription Management UI

This task is delegated to the "frontend skill" as per user instruction. The implementation details will be handled by that skill. The plan here is to define the integration points and requirements for that skill.

**Files:**
*   N/A (Handled by separate frontend skill)

- [ ] **Step 1: Document the delegation and requirements for the frontend skill.**
    - Specify that the frontend skill should manage:
        - Adding/removing GitHub repositories to monitor.
        - Selecting event types for each subscription.
        - Choosing notification channels (Telegram, Slack, Email).
        - Configuring connection credentials for these channels.
        - Displaying a list of active subscriptions.
        - Optionally, displaying a notification history.
    - Ensure the UI allows for selection of all `SubscriptionEventType`s.
    - Note that pre-defined message templates will be used, without user customization for templates at this stage.

```markdown
## Frontend Implementation Requirements for GitHub Event Notifications

The user interface for managing GitHub event notifications will be implemented by a dedicated "frontend skill." This UI needs to provide the following capabilities:

1.  **Repository Configuration:**
    *   Users must be able to add GitHub repositories to monitor (requiring `owner`, `repoName`, and `accessToken`).
    *   Functionality to edit or remove configured repositories.

2.  **Subscription Management:**
    *   For each configured repository, users must be able to subscribe to specific GitHub event types. All `SubscriptionEventType`s (e.g., `new_release`, `pr_opened`, `issue_closed`, `workflow_completed`) should be selectable.
    *   Users should be able to view their active subscriptions and unsubscribe from specific events or repositories.

3.  **Notification Channel & Credential Management:**
    *   Users must be able to select their preferred notification channels from supported options: Telegram, Slack, and Email.
    *   Secure input and storage (via backend) for channel-specific credentials (e.g., Telegram bot token, Slack webhook URL, Email address).

4.  **Notification History (Optional but Recommended):**
    *   A view where users can see a log of past notifications received.

5.  **Backend Integration:**
    *   The frontend will interact with backend APIs to save/retrieve repository configurations, subscriptions, and connection credentials.
    *   It will display notifications received through the system (if a history view is implemented).

**Note:** Message templates for notifications are pre-defined and not customizable by the user in this version.
```

- [ ] **Step 2: Commit the documentation for the frontend skill's requirements.**

```bash
git add docs/superpowers/specs/2026-05-04-github-event-notifications-design.md # (assuming this is where delegation details were added)
git commit -m "ref: document frontend skill requirements for GitHub notification subscriptions"
```

## Task 3: Backend - Implement Pre-defined Message Templates

This task focuses on creating the actual message templates used by the notification system.

**Files:**
*   Create: `src/modules/notification/notification.templates.ts` (or update if `notification.template.ts` is meant for this)
*   Test: `tests/modules/notification/notification.template.test.ts`

- [ ] **Step 1: Create a file `src/modules/notification/notification.templates.ts` to hold the pre-defined templates.**
    - Define templates for each `SubscriptionEventType`.
    - Use placeholders that match the `TemplateVars` structure returned by `GithubPollerService`.

```typescript
// src/modules/notification/notification.templates.ts
import { SubscriptionEventType } from '../../modules/subscription/subscription.event_types';
import { TemplateVars } from './notification.template'; // Assuming this is the correct import path

export const PREDEFINED_NOTIFICATION_TEMPLATES: Record<SubscriptionEventType | string, (vars: TemplateVars) => string> = {
    new_release: (vars) => `🚀 New Release: '${vars.name ?? vars.tag_name}' published for ${vars.repo}! View at: ${vars.url}`,
    new_commit: (vars) => `✨ New Commit: ${vars.sha} by ${vars.author} in ${vars.repo}. Message: "${vars.message}". View at: ${vars.url}`,
    new_branch: (vars) => `🌿 New Branch: '${vars.branch}' created in ${vars.repo}.`,
    new_tag: (vars) => `🏷️ New Tag: '${vars.tag}' pushed to ${vars.repo}.`,
    issue_opened: (vars) => `🚩 New Issue Opened: #${vars.number} - "${vars.title}" in ${vars.repo}. View at: ${vars.url}`,
    issue_closed: (vars) => `✅ Issue Closed: #${vars.number} - "${vars.title}" in ${vars.repo}. View at: ${vars.url}`,
    pr_opened: (vars) => `📬 New Pull Request Opened: #${vars.number} - "${vars.title}" in ${vars.repo}. View at: ${vars.url}`,
    pr_merged: (vars) => `🎉 Pull Request Merged: #${vars.number} - "${vars.title}" in ${vars.repo}. View at: ${vars.url}`,
    workflow_completed: (vars) => `⚙️ Workflow Completed: '${vars.workflow}' in ${vars.repo} with status: ${vars.conclusion}. View at: ${vars.url}`,
    star_milestone: (vars) => `⭐ Star Milestone Reached! ${vars.repo} now has ${vars.stars} stars (milestone: ${vars.milestone}).`,
    fork_milestone: (vars) => `🍴 Fork Milestone Reached! ${vars.repo} now has ${vars.forks} forks (milestone: ${vars.milestone}).`,
    // Default/fallback template if needed for unknown event types or specific configurations
    default: (vars) => `🔔 New event in ${vars.repo}: ${JSON.stringify(vars)}`,
};

// Function to get the appropriate template renderer
export function getTemplateRenderer(eventType: SubscriptionEventType | string): (vars: TemplateVars) => string {
    return PREDEFINED_NOTIFICATION_TEMPLATES[eventType] || PREDEFINED_NOTIFICATION_TEMPLATES.default;
}
```

- [ ] **Step 2: Update `notification.dispatcher.ts` (or relevant file) to use these pre-defined templates.**
    - Modify `renderTemplate` (or its equivalent) to use `getTemplateRenderer` and pass the correct `eventType`.
    - *Assuming `renderTemplate` is in `notification.template.ts` and can be updated.*
    - **If `renderTemplate` is not directly in `NotificationDispatcher`, update the code that calls it.** For example, in `GithubPollWorker.processSubscription`.

```typescript
// Example modification in GithubPollWorker.processSubscription (if renderTemplate is called here)

// ... inside processSubscription ...
        // ... after fetching connection ...
        for (const vars of result.events) {
            // Assuming 'sub.event_type' is available here and 'renderTemplate' is updated or replaced
            // To use the new templates, we might call a function like:
            // const message = getTemplateRenderer(sub.event_type)(vars);

            // If renderTemplate needs to be updated to access the new templates file:
            // import { getTemplateRenderer } from '../modules/notification/notification.templates';
            // const message = getTemplateRenderer(sub.event_type)(vars);

            // For now, let's assume renderTemplate is updated to use the new templates.
            // If renderTemplate is a method of NotificationDispatcher, update that.
            // If it's a standalone function, update its import and implementation.

            // Placeholder assuming renderTemplate now uses the new system:
            const message = renderTemplate(sub.message_template, vars); // This line might need adjustment depending on how renderTemplate is used/implemented.
                                                                       // The actual change would be to ensure renderTemplate uses the templates from notification.templates.ts

            try {
                await this.dispatcher.dispatch(connection.credentials, message);
            } catch (e) {
                console.error(`[GithubPollWorker] Dispatch failed for subscription ${sub.subscription_id}:`, e);
            }
        }
// ...
```
    - *Note: The exact modification depends on where `renderTemplate` is defined and how it's used. This step assumes it's either updated or replaced by a call to `getTemplateRenderer`.*

- [ ] **Step 3: Write tests for `notification.template.test.ts` to verify template rendering for various event types.**
    - Test with different `TemplateVars` for each `SubscriptionEventType`.
    - Ensure placeholders are correctly substituted.

```typescript
// tests/modules/notification/notification.template.test.ts (example snippet)
import { PREDEFINED_NOTIFICATION_TEMPLATES, getTemplateRenderer } from '../../src/modules/notification/notification.templates';
import { TemplateVars } from '../../src/modules/notification/notification.template';

describe('Notification Templates', () => {
    it('should render new_release template correctly', () => {
        const vars: TemplateVars = {
            repo: 'owner/repo',
            tag_name: 'v1.0.0',
            name: 'Version 1.0.0',
            url: 'http://github.com/owner/repo/releases/v1.0.0',
        };
        const templateRenderer = getTemplateRenderer('new_release');
        expect(templateRenderer(vars)).toBe('🚀 New Release: 'Version 1.0.0' published for owner/repo! View at: http://github.com/owner/repo/releases/v1.0.0');
    });

    it('should render new_commit template correctly', () => {
        const vars: TemplateVars = {
            repo: 'owner/repo',
            sha: 'abcdef1',
            message: 'Fix bug',
            author: 'Test User',
            url: 'http://github.com/owner/repo/commit/abcdef1',
        };
        const templateRenderer = getTemplateRenderer('new_commit');
        expect(templateRenderer(vars)).toBe('✨ New Commit: abcdef1 by Test User in owner/repo. Message: "Fix bug". View at: http://github.com/owner/repo/commit/abcdef1');
    });

    // Add more tests for other event types...

    it('should render default template for unknown event type', () => {
        const vars: TemplateVars = { repo: 'owner/repo', unknown_key: 'some_value' };
        const templateRenderer = getTemplateRenderer('unknown_event');
        expect(templateRenderer(vars)).toBe('🔔 New event in owner/repo: {"repo":"owner/repo","unknown_key":"some_value"}');
    });
});
```

- [ ] **Step 4: Run tests to verify template rendering.**
- [ ] **Step 5: Commit**

```bash
git add src/modules/notification/notification.templates.ts src/modules/notification/notification.template.ts # (or whichever file renderTemplate is in) tests/modules/notification/notification.template.test.ts
git commit -m "feat: implement pre-defined notification templates and integrate"
```

## Task 4: Backend - Ensure Event-Specific Configuration Handling

This task addresses the `config` parameter used in some polling methods (e.g., `workflow_completed`, `star_milestone`, `fork_milestone`).

**Files:**
*   Modify: `src/modules/subscription/usecases/subscription.create.usecase.ts`
*   Modify: `src/workers/github.poll.worker.ts`
*   Test: `tests/workers/github.poll.worker.test.ts` (add test cases)

- [ ] **Step 1: Update `subscription.create.usecase.ts` to allow for configuration specific to certain event types.**
    - If the `Subscription` entity needs a new field to store event-specific config, update the entity, DTO, mapper, and any relevant repository methods.
    - *Assume `config` field in `SubscriptionWithSource` is sufficient for now.*

- [ ] **Step 2: Update `GithubPollWorker.processSubscription` to pass the `config` object correctly to the polling functions.**
    - Ensure the `config` from `SubscriptionWithSource` is passed when calling polling methods that require it (e.g., `pollWorkflowCompleted`).

```typescript
// src/workers/github.poll.worker.ts (modification example)

// ... inside poll method ...
        const map: Record<SubscriptionEventType, () => Promise<PollResult>> = {
            // ... other events ...
            workflow_completed:  () => p.pollWorkflowCompleted(octokit, owner, repo, lastSeen, config), // Pass config
            star_milestone:      () => p.pollStarMilestone(octokit, owner, repo, lastSeen, config),     // Pass config
            fork_milestone:      () => p.pollForkMilestone(octokit, owner, repo, lastSeen, config),     // Pass config
            // ...
        };
// ...
```

- [ ] **Step 3: Add test cases to `tests/workers/github.poll.worker.test.ts` to cover event types that use configuration.**
    - Test `pollWorkflowCompleted`, `pollStarMilestone`, `pollForkMilestone` with relevant mock configurations.
    - Verify that the correct configuration values are passed to the polling functions and that the results are handled correctly.

```typescript
// tests/workers/github.poll.worker.test.ts (additional test snippet)
    it('should pass config to pollWorkflowCompleted', async () => {
        mockSubscription.event_type = 'workflow_completed';
        mockSubscription.config = { workflow_id: '12345' };
        mockSubscription.last_seen = { latest_run_id: 789 };

        (mockPoller.poll as jest.Mock).mockResolvedValue({
            initialized: false,
            newLastSeen: { latest_run_id: 999 },
            events: [{ repo: 'owner/repo', workflow: 'CI Build', conclusion: 'success', url: 'workflow_url' }],
        });

        await worker.processSubscription(mockSubscription);

        expect(mockPoller.poll).toHaveBeenCalledWith(expect.any(Octokit), 'owner', 'repo', { latest_run_id: 789 }, { workflow_id: '12345' }); // Check config is passed
    });

    it('should pass config to pollStarMilestone', async () => {
        mockSubscription.event_type = 'star_milestone';
        mockSubscription.config = { milestone: 1000 };
        mockSubscription.last_seen = { stars: 500 };

        (mockPoller.poll as jest.Mock).mockResolvedValue({
            initialized: false,
            newLastSeen: { stars: 1200 },
            events: [{ repo: 'owner/repo', stars: 1200, milestone: 1000 }],
        });

        await worker.processSubscription(mockSubscription);

        expect(mockPoller.poll).toHaveBeenCalledWith(expect.any(Octokit), 'owner', 'repo', { stars: 500 }, { milestone: 1000 }); // Check config is passed
    });
```

- [ ] **Step 4: Run tests to verify configuration handling.**
- [ ] **Step 5: Commit**

```bash
git add src/workers/github.poll.worker.ts tests/workers/github.poll.worker.test.ts src/modules/subscription/usecases/subscription.create.usecase.ts # (if modified)
git commit -m "feat: enhance backend to pass and handle event-specific configurations"
```

## Task 5: Documentation - Finalize Design Spec

Ensure the design document includes the details about pre-defined templates and frontend delegation.

**Files:**
*   Modify: `docs/superpowers/specs/2026-05-04-github-event-notifications-design.md`

- [ ] **Step 1: Update the design document to explicitly mention the pre-defined templates and the frontend skill delegation.**
    - Ensure clarity on these points based on the user's confirmation.

- [ ] **Step 2: Commit the updated design document.**

```bash
git add docs/superpowers/specs/2026-05-04-github-event-notifications-design.md
git commit -m "docs: finalize design spec with pre-defined templates and frontend skill delegation details"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-05-04-github-event-notifications.md`. Two execution options:

1.  **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2.  **Inline Execution** - Execute tasks in this session using `executing-plans`, batch execution with checkpoints

Which approach?
