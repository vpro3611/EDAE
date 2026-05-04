import { SubscriptionRepoWriterInterface } from '../interfaces/interface.repository';
import { GithubSourceRepoReaderInterface } from '../../github_source/interfaces/interface.repository';
import { SubscriptionDtoMapper } from '../dto/subscription.dto.mapper';
import { SubscriptionDto } from '../dto/subscription.dto';
import { Subscription } from '../entity/subscription';
import { SubscriptionEventType } from '../subscription.event_types';
import { throwAppError } from '../../errors/errors.global';

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

        const data = Subscription.createForDatabase(githubSourceId, eventType, connectionId, messageTemplate, config);
        const subscription = await this.writer.createSubscription(data);
        return this.mapper.mapToDto(subscription);
    }
}
