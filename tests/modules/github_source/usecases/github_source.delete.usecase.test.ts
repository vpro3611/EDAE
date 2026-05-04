import { GithubSourceDeleteUseCase } from '../../../../src/modules/github_source/usecases/github_source.delete.usecase';
import {
    GithubSourceRepoReaderInterface,
    GithubSourceRepoWriterInterface,
} from '../../../../src/modules/github_source/interfaces/interface.repository';
import { GithubSource } from '../../../../src/modules/github_source/entity/github_source';
import { AppError } from '../../../../src/modules/errors/errors.global';

const NOW = new Date('2024-01-01T00:00:00.000Z');
const LATER = new Date('2024-06-01T00:00:00.000Z');

function makeSource(userId: string = 'user-1'): GithubSource {
    return GithubSource.restore('src-1', userId, 'octocat', 'hello-world', null, NOW, LATER);
}

describe('GithubSourceDeleteUseCase', () => {
    let reader: jest.Mocked<GithubSourceRepoReaderInterface>;
    let writer: jest.Mocked<GithubSourceRepoWriterInterface>;
    let useCase: GithubSourceDeleteUseCase;

    beforeEach(() => {
        reader = {
            getSourceById: jest.fn(),
            getSourcesByUserId: jest.fn(),
        };
        writer = {
            createSource: jest.fn(),
            deleteSource: jest.fn(),
        };
        useCase = GithubSourceDeleteUseCase.create(reader, writer);
    });

    it('deletes the source when it exists and actor owns it', async () => {
        reader.getSourceById.mockResolvedValue(makeSource('user-1'));
        writer.deleteSource.mockResolvedValue(undefined);
        await expect(useCase.execute('user-1', 'src-1')).resolves.toBeUndefined();
        expect(writer.deleteSource).toHaveBeenCalledWith('src-1');
    });

    it('throws 404 when source is not found', async () => {
        reader.getSourceById.mockResolvedValue(null);
        try {
            await useCase.execute('user-1', 'nonexistent');
            fail('expected error');
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(404);
            expect(e.message).toBe('GitHub source not found.');
        }
        expect(writer.deleteSource).not.toHaveBeenCalled();
    });

    it('throws 403 when actor does not own the source', async () => {
        reader.getSourceById.mockResolvedValue(makeSource('user-1'));
        try {
            await useCase.execute('other-user', 'src-1');
            fail('expected error');
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(403);
        }
        expect(writer.deleteSource).not.toHaveBeenCalled();
    });

    it('calls reader.getSourceById with correct sourceId', async () => {
        reader.getSourceById.mockResolvedValue(makeSource('user-1'));
        writer.deleteSource.mockResolvedValue(undefined);
        await useCase.execute('user-1', 'src-42');
        expect(reader.getSourceById).toHaveBeenCalledWith('src-42');
    });
});
