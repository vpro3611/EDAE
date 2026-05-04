import { GithubSourceRepoReaderInterface } from '../interfaces/interface.repository';
import { GithubSourceDtoMapper } from '../dto/github_source.dto.mapper';
import { GithubSourceDto } from '../dto/github_source.dto';

export class GithubSourceListUseCase {
    constructor(
        private readonly reader: GithubSourceRepoReaderInterface,
        private readonly mapper: GithubSourceDtoMapper,
    ) {}

    static create(reader: GithubSourceRepoReaderInterface, mapper: GithubSourceDtoMapper): GithubSourceListUseCase {
        return new GithubSourceListUseCase(reader, mapper);
    }

    async execute(userId: string): Promise<GithubSourceDto[]> {
        const sources = await this.reader.getSourcesByUserId(userId);
        return sources.map(s => this.mapper.mapToDto(s));
    }
}
