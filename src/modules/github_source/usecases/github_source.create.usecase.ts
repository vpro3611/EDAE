import { GithubSourceRepoWriterInterface } from '../interfaces/interface.repository';
import { GithubSourceDtoMapper } from '../dto/github_source.dto.mapper';
import { GithubSourceDto } from '../dto/github_source.dto';
import { GithubSource } from '../entity/github_source';

export class GithubSourceCreateUseCase {
    constructor(
        private readonly writer: GithubSourceRepoWriterInterface,
        private readonly mapper: GithubSourceDtoMapper,
    ) {}

    static create(writer: GithubSourceRepoWriterInterface, mapper: GithubSourceDtoMapper): GithubSourceCreateUseCase {
        return new GithubSourceCreateUseCase(writer, mapper);
    }

    async execute(userId: string, repoOwner: string, repoName: string, accessToken: string | null): Promise<GithubSourceDto> {
        const data = GithubSource.createForDatabase(userId, repoOwner, repoName, accessToken);
        const source = await this.writer.createSource(data);
        return this.mapper.mapToDto(source);
    }
}
