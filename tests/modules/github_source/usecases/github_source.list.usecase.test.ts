import { GithubSourceListUseCase } from '../../../../src/modules/github_source/usecases/github_source.list.usecase';
import { GithubSourceDtoMapper } from '../../../../src/modules/github_source/dto/github_source.dto.mapper';
import { GithubSourceRepoReaderInterface } from '../../../../src/modules/github_source/interfaces/interface.repository';
import { GithubSource } from '../../../../src/modules/github_source/entity/github_source';

const NOW = new Date('2024-01-01T00:00:00.000Z');
const LATER = new Date('2024-06-01T00:00:00.000Z');

function makeSource(id: string, userId: string, accessToken: string | null = null): GithubSource {
    return GithubSource.restore(id, userId, 'octocat', 'hello-world', accessToken, NOW, LATER);
}

describe('GithubSourceListUseCase', () => {
    let reader: jest.Mocked<GithubSourceRepoReaderInterface>;
    let mapper: GithubSourceDtoMapper;
    let useCase: GithubSourceListUseCase;

    beforeEach(() => {
        reader = {
            getSourceById: jest.fn(),
            getSourcesByUserId: jest.fn(),
        };
        mapper = GithubSourceDtoMapper.create();
        useCase = GithubSourceListUseCase.create(reader, mapper);
    });

    it('returns mapped DTOs for all sources belonging to the user', async () => {
        reader.getSourcesByUserId.mockResolvedValue([
            makeSource('src-1', 'user-1', 'tok'),
            makeSource('src-2', 'user-1', null),
        ]);
        const dtos = await useCase.execute('user-1');
        expect(dtos).toHaveLength(2);
        expect(dtos[0].id).toBe('src-1');
        expect(dtos[0].has_token).toBe(true);
        expect(dtos[1].id).toBe('src-2');
        expect(dtos[1].has_token).toBe(false);
    });

    it('returns empty array when user has no sources', async () => {
        reader.getSourcesByUserId.mockResolvedValue([]);
        const dtos = await useCase.execute('user-1');
        expect(dtos).toEqual([]);
    });

    it('calls reader.getSourcesByUserId with correct userId', async () => {
        reader.getSourcesByUserId.mockResolvedValue([]);
        await useCase.execute('user-42');
        expect(reader.getSourcesByUserId).toHaveBeenCalledWith('user-42');
    });
});
