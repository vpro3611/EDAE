import { GithubSource } from '../../../../src/modules/github_source/entity/github_source';
import { GithubSourceDtoMapper } from '../../../../src/modules/github_source/dto/github_source.dto.mapper';

const NOW = new Date('2024-01-01T10:00:00.000Z');
const LATER = new Date('2024-06-15T12:30:00.000Z');

function makeSource(accessToken: string | null): GithubSource {
    return GithubSource.restore('src-1', 'user-1', 'octocat', 'hello-world', accessToken, NOW, LATER);
}

describe('GithubSourceDtoMapper', () => {
    let mapper: GithubSourceDtoMapper;

    beforeEach(() => {
        mapper = GithubSourceDtoMapper.create();
    });

    it('maps source with access_token to DTO with has_token=true', () => {
        const dto = mapper.mapToDto(makeSource('ghp_secret'));
        expect(dto).toEqual({
            id: 'src-1',
            user_id: 'user-1',
            repo_owner: 'octocat',
            repo_name: 'hello-world',
            has_token: true,
            created_at: NOW.toISOString(),
            updated_at: LATER.toISOString(),
        });
    });

    it('maps source with null access_token to DTO with has_token=false', () => {
        const dto = mapper.mapToDto(makeSource(null));
        expect(dto.has_token).toBe(false);
    });

    it('serialises dates as ISO strings', () => {
        const dto = mapper.mapToDto(makeSource(null));
        expect(dto.created_at).toBe('2024-01-01T10:00:00.000Z');
        expect(dto.updated_at).toBe('2024-06-15T12:30:00.000Z');
    });

    it('does not expose access_token in the DTO', () => {
        const dto = mapper.mapToDto(makeSource('secret')) as any;
        expect(dto.access_token).toBeUndefined();
    });
});
