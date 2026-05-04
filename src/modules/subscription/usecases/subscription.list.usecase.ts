import { SubscriptionRepoReaderInterface } from '../interfaces/interface.repository';
import { GithubSourceRepoReaderInterface } from '../../github_source/interfaces/interface.repository';
import { SubscriptionDtoMapper } from '../dto/subscription.dto.mapper';
import { SubscriptionDto } from '../dto/subscription.dto';
import { throwAppError } from '../../errors/errors.global';

export class SubscriptionListUseCase {
    private moduleName = 'SubscriptionListUseCase';

    constructor(
        private readonly sourceReader: GithubSourceRepoReaderInterface,
        private readonly reader: SubscriptionRepoReaderInterface,
        private readonly mapper: SubscriptionDtoMapper,
    ) {}

    static create(
        sourceReader: GithubSourceRepoReaderInterface,
        reader: SubscriptionRepoReaderInterface,
        mapper: SubscriptionDtoMapper,
    ): SubscriptionListUseCase {
        return new SubscriptionListUseCase(sourceReader, reader, mapper);
    }

    async execute(actorId: string, sourceId: string): Promise<SubscriptionDto[]> {
        const source = await this.sourceReader.getSourceById(sourceId);
        if (!source) {
            throwAppError('GitHub source not found.', 404, `${this.moduleName}.execute`);
        }
        source.ensureOwnership(actorId, 'listSubscriptions');

        const subs = await this.reader.getSubscriptionsBySourceId(sourceId);
        return subs.map(s => this.mapper.mapToDto(s));
    }
}
