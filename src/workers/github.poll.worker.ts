import { Octokit } from '@octokit/rest';
import { Pool } from 'pg';
import { SubscriptionWithSource } from '../modules/subscription/subscription.worker_types';
import { SubscriptionEventType } from '../modules/subscription/subscription.event_types';
import { GithubPollerService, PollResult } from './github.poller';
import { renderTemplate } from '../modules/notification/notification.template';
import { NotificationDispatcher } from '../modules/notification/notification.dispatcher';
import { RepositoryConnectionReader } from '../modules/connection/repository/repository.connection.reader';
import { RepositorySubscriptionWriter } from '../modules/subscription/repository/repository.subscription.writer';
import { InfraEncryptionInterface } from '../modules/infra/encryption/infra.encryption.interface';

const TAG = '[GithubPollWorker]';

export class GithubPollWorker {
    constructor(
        private readonly db: Pool,
        private readonly encryption: InfraEncryptionInterface,
        private readonly poller: GithubPollerService,
        private readonly dispatcher: NotificationDispatcher,
    ) {}

    static create(
        db: Pool,
        encryption: InfraEncryptionInterface,
        poller: GithubPollerService,
        dispatcher: NotificationDispatcher,
    ): GithubPollWorker {
        return new GithubPollWorker(db, encryption, poller, dispatcher);
    }

    async processSubscription(sub: SubscriptionWithSource): Promise<void> {
        const label = `${sub.repo_owner}/${sub.repo_name} [${sub.event_type}] sub=${sub.subscription_id}`;
        console.log(`${TAG} polling ${label}`);

        const octokit = new Octokit({ auth: sub.access_token ?? undefined });

        let result: PollResult;
        try {
            result = await this.poll(octokit, sub);
        } catch (e) {
            console.error(`${TAG} poll error — ${label}:`, e);
            return;
        }

        console.log(`${TAG} poll result — ${label}: initialized=${result.initialized} events=${result.events.length} newLastSeen=${JSON.stringify(result.newLastSeen)}`);

        if (Object.keys(result.newLastSeen).length > 0) {
            try {
                const writer = RepositorySubscriptionWriter.create(this.db);
                await writer.updateLastSeen(sub.subscription_id, result.newLastSeen);
                console.log(`${TAG} lastSeen updated — ${label}`);
            } catch (e) {
                console.error(`${TAG} failed to update lastSeen — ${label}:`, e);
            }
        }

        if (result.initialized) {
            console.log(`${TAG} first poll — initialised lastSeen, no notifications — ${label}`);
            return;
        }

        if (result.events.length === 0) {
            console.log(`${TAG} no new events — ${label}`);
            return;
        }

        console.log(`${TAG} fetching connection ${sub.connection_id} — ${label}`);
        let connection;
        try {
            const connectionReader = RepositoryConnectionReader.create(this.db, this.encryption);
            connection = await connectionReader.getConnectionById(sub.connection_id);
        } catch (e) {
            console.error(`${TAG} failed to fetch connection ${sub.connection_id} — ${label}:`, e);
            return;
        }

        if (!connection) {
            console.warn(`${TAG} connection ${sub.connection_id} not found — ${label}`);
            return;
        }

        console.log(`${TAG} dispatching ${result.events.length} notification(s) via ${connection.credentials.provider} — ${label}`);

        for (const vars of result.events) {
            const message = renderTemplate(sub.message_template, vars);
            try {
                await this.dispatcher.dispatch(connection.credentials, message);
                console.log(`${TAG} dispatched OK — ${label} | message: ${message.slice(0, 80)}`);
            } catch (e) {
                console.error(`${TAG} dispatch failed — ${label}:`, e);
            }
        }
    }

    private poll(octokit: Octokit, sub: SubscriptionWithSource): Promise<PollResult> {
        const { repo_owner: owner, repo_name: repo, last_seen: lastSeen, config, event_type } = sub;
        const p = this.poller;

        const map: Record<SubscriptionEventType, () => Promise<PollResult>> = {
            new_release:         () => p.pollNewRelease(octokit, owner, repo, lastSeen),
            new_commit:          () => p.pollNewCommit(octokit, owner, repo, lastSeen),
            new_branch:          () => p.pollNewBranch(octokit, owner, repo, lastSeen),
            new_tag:             () => p.pollNewTag(octokit, owner, repo, lastSeen),
            issue_opened:        () => p.pollIssueOpened(octokit, owner, repo, lastSeen),
            issue_closed:        () => p.pollIssueClosed(octokit, owner, repo, lastSeen),
            pr_opened:           () => p.pollPrOpened(octokit, owner, repo, lastSeen),
            pr_merged:           () => p.pollPrMerged(octokit, owner, repo, lastSeen),
            workflow_completed:  () => p.pollWorkflowCompleted(octokit, owner, repo, lastSeen, config),
            star_milestone:      () => p.pollStarMilestone(octokit, owner, repo, lastSeen, config),
            fork_milestone:      () => p.pollForkMilestone(octokit, owner, repo, lastSeen, config),
        };

        return map[event_type]();
    }
}
