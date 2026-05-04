import { GithubSourceRepoReaderInterface, GithubSourceRepoWriterInterface } from '../interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';

export class GithubSourceDeleteUseCase {
    private moduleName = 'GithubSourceDeleteUseCase';

    constructor(
        private readonly reader: GithubSourceRepoReaderInterface,
        private readonly writer: GithubSourceRepoWriterInterface,
    ) {}

    static create(reader: GithubSourceRepoReaderInterface, writer: GithubSourceRepoWriterInterface): GithubSourceDeleteUseCase {
        return new GithubSourceDeleteUseCase(reader, writer);
    }

    async execute(actorId: string, sourceId: string): Promise<void> {
        const source = await this.reader.getSourceById(sourceId);
        if (!source) {
            throwAppError('GitHub source not found.', 404, `${this.moduleName}.execute`);
        }
        source.ensureOwnership(actorId, 'delete');
        await this.writer.deleteSource(sourceId);
    }
}
