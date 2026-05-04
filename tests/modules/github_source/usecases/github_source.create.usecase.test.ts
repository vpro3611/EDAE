import { GithubSourceCreateUseCase } from '../../../../src/modules/github_source/usecases/github_source.create.usecase';
import { GithubSourceDtoMapper } from '../../../../src/modules/github_source/dto/github_source.dto.mapper';
import { GithubSourceRepoWriterInterface } from '../../../../src/modules/github_source/interfaces/interface.repository';
import { GithubSource } from '../../../../src/modules/github_source/entity/github_source';
import { AppError } from '../../../../src/modules/errors/errors.global';

const NOW = new Date('2024-01-01T00:00:00.000Z');
const LATER = new Date('2024-06-01T00:00:00.000Z');

function makeSource(accessToken: string | null = 'tok'): GithubSource {
    return GithubSource.restore('src-1', 'user-1', 'octocat', 'hello-world', accessToken, NOW, LATER);
}

describe('GithubSourceCreateUseCase', () => {
    let writer: jest.Mocked<GithubSourceRepoWriterInterface>;
    let mapper: GithubSourceDtoMapper;
    let useCase: GithubSourceCreateUseCase;

    beforeEach(() => {
        writer = {
            createSource: jest.fn(),
            deleteSource: jest.fn(),
        };
        mapper = GithubSourceDtoMapper.create();
        useCase = GithubSourceCreateUseCase.create(writer, mapper);
    });

    it('creates and returns DTO with token', async () => {
        writer.createSource.mockResolvedValue(makeSource('ghp_token'));
        const dto = await useCase.execute('user-1', 'octocat', 'hello-world', 'ghp_token');
        expect(dto.id).toBe('src-1');
        expect(dto.repo_owner).toBe('octocat');
        expect(dto.repo_name).toBe('hello-world');
        expect(dto.has_token).toBe(true);
    });

    it('creates and returns DTO with null token', async () => {
        writer.createSource.mockResolvedValue(makeSource(null));
        const dto = await useCase.execute('user-1', 'octocat', 'hello-world', null);
        expect(dto.has_token).toBe(false);
    });

    it('calls writer.createSource with correct data', async () => {
        writer.createSource.mockResolvedValue(makeSource('tok'));
        await useCase.execute('user-1', 'octocat', 'hello-world', 'tok');
        expect(writer.createSource).toHaveBeenCalledWith({
            user_id: 'user-1',
            repo_owner: 'octocat',
            repo_name: 'hello-world',
            access_token: 'tok',
        });
    });

    it('throws 400 validation error before calling writer when repo_owner is empty', async () => {
        await expect(useCase.execute('user-1', '', 'hello-world', null)).rejects.toBeInstanceOf(AppError);
        expect(writer.createSource).not.toHaveBeenCalled();
    });

    it('throws 400 validation error before calling writer when repo_name is empty', async () => {
        await expect(useCase.execute('user-1', 'octocat', '', null)).rejects.toBeInstanceOf(AppError);
        expect(writer.createSource).not.toHaveBeenCalled();
    });

    it('throws 400 when repo_owner is too long', async () => {
        const longOwner = 'a'.repeat(256);
        await expect(useCase.execute('user-1', longOwner, 'hello-world', null)).rejects.toBeInstanceOf(AppError);
        expect(writer.createSource).not.toHaveBeenCalled();
    });
});
