import { SubscriptionRepoReaderInterface, SubscriptionRepoWriterInterface } from '../interfaces/interface.repository';
import { GithubSourceRepoReaderInterface } from '../../github_source/interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';

export class SubscriptionDeleteUseCase {
    private moduleName = 'SubscriptionDeleteUseCase';

    constructor(
        private readonly sourceReader: GithubSourceRepoReaderInterface,
        private readonly reader: SubscriptionRepoReaderInterface,
        private readonly writer: SubscriptionRepoWriterInterface,
    ) {}

    static create(
        sourceReader: GithubSourceRepoReaderInterface,
        reader: SubscriptionRepoReaderInterface,
        writer: SubscriptionRepoWriterInterface,
    ): SubscriptionDeleteUseCase {
        return new SubscriptionDeleteUseCase(sourceReader, reader, writer);
    }

    async execute(actorId: string, subscriptionId: string): Promise<void> {
        const subscription = await this.reader.getSubscriptionById(subscriptionId);
        if (!subscription) {
            throwAppError('Subscription not found.', 404, `${this.moduleName}.execute`);
        }

        const source = await this.sourceReader.getSourceById(subscription.github_source_id);
        if (!source) {
            throwAppError('GitHub source not found.', 404, `${this.moduleName}.execute`);
        }
        source.ensureOwnership(actorId, 'deleteSubscription');

        await this.writer.deleteSubscription(subscriptionId);
    }
}
