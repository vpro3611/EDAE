import { Octokit } from '@octokit/rest';
import { SubscriptionRepoWriterInterface } from '../interfaces/interface.repository';
import { GithubSourceRepoReaderInterface } from '../../github_source/interfaces/interface.repository';
import { SubscriptionDtoMapper } from '../dto/subscription.dto.mapper';
import { SubscriptionDto } from '../dto/subscription.dto';
import { Subscription } from '../entity/subscription';
import { SubscriptionEventType } from '../subscription.event_types';
import { throwAppError } from '../../errors/errors.global';
import { BOOTSTRAP_MARKER } from '../../../workers/github.poller';

export class SubscriptionCreateUseCase {
    private moduleName = 'SubscriptionCreateUseCase';

    constructor(
        private readonly sourceReader: GithubSourceRepoReaderInterface,
        private readonly writer: SubscriptionRepoWriterInterface,
        private readonly mapper: SubscriptionDtoMapper,
    ) {}

    static create(
        sourceReader: GithubSourceRepoReaderInterface,
        writer: SubscriptionRepoWriterInterface,
        mapper: SubscriptionDtoMapper,
    ): SubscriptionCreateUseCase {
        return new SubscriptionCreateUseCase(sourceReader, writer, mapper);
    }

    async execute(
        actorId: string,
        githubSourceId: string,
        eventType: SubscriptionEventType,
        connectionId: string,
        messageTemplate: string,
        config: Record<string, unknown>,
    ): Promise<SubscriptionDto> {
        const source = await this.sourceReader.getSourceById(githubSourceId);
        if (!source) {
            throwAppError('GitHub source not found.', 404, `${this.moduleName}.execute`);
        }
        source.ensureOwnership(actorId, 'createSubscription');

        // For milestone event types, seed last_seen with the current count so that
        // any star/fork that occurred between subscription creation and the first poll
        // is not silently swallowed by the bootstrap.
        let initialLastSeen: Record<string, unknown> | undefined;
        if (eventType === 'star_milestone' || eventType === 'fork_milestone') {
            try {
                const octokit = new Octokit({ auth: source!.access_token ?? undefined });
                const { data: repoData } = await octokit.repos.get({
                    owner: source!.repo_owner,
                    repo: source!.repo_name,
                });
                const count = eventType === 'star_milestone'
                    ? repoData.stargazers_count
                    : repoData.forks_count;
                const key = eventType === 'star_milestone' ? 'stars' : 'forks';
                initialLastSeen = { [key]: count, [BOOTSTRAP_MARKER]: true };
            } catch {
                // GitHub API unreachable — the first poll will bootstrap as before
            }
        }

        const data = Subscription.createForDatabase(githubSourceId, eventType, connectionId, messageTemplate, config);
        const subscription = await this.writer.createSubscription({
            ...data,
            ...(initialLastSeen !== undefined ? { initial_last_seen: initialLastSeen } : {}),
        });
        return this.mapper.mapToDto(subscription);
    }
}
