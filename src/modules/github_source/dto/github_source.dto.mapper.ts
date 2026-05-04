import { GithubSource } from '../entity/github_source';
import { GithubSourceDto } from './github_source.dto';

export class GithubSourceDtoMapper {
    static create(): GithubSourceDtoMapper {
        return new GithubSourceDtoMapper();
    }

    mapToDto(source: GithubSource): GithubSourceDto {
        return {
            id: source.id,
            user_id: source.user_id,
            repo_owner: source.repo_owner,
            repo_name: source.repo_name,
            has_token: source.access_token !== null,
            created_at: source.created_at.toISOString(),
            updated_at: source.updated_at.toISOString(),
        };
    }
}
