import { GithubSource } from '../../../../src/modules/github_source/entity/github_source';
import { AppError } from '../../../../src/modules/errors/errors.global';

const NOW = new Date('2024-01-01T00:00:00.000Z');
const LATER = new Date('2024-06-01T00:00:00.000Z');

function makeSource(overrides: Partial<{
    id: string; user_id: string; repo_owner: string; repo_name: string;
    access_token: string | null; created_at: Date; updated_at: Date;
}> = {}): GithubSource {
    return GithubSource.restore(
        overrides.id ?? 'src-1',
        overrides.user_id ?? 'user-1',
        overrides.repo_owner ?? 'octocat',
        overrides.repo_name ?? 'hello-world',
        overrides.access_token !== undefined ? overrides.access_token : 'tok',
        overrides.created_at ?? NOW,
        overrides.updated_at ?? LATER,
    );
}

describe('GithubSource.createForDatabase', () => {
    it('returns plain data object on happy path with token', () => {
        const data = GithubSource.createForDatabase('user-1', 'octocat', 'hello-world', 'tok');
        expect(data).toEqual({
            user_id: 'user-1',
            repo_owner: 'octocat',
            repo_name: 'hello-world',
            access_token: 'tok',
        });
    });

    it('returns plain data object on happy path with null token', () => {
        const data = GithubSource.createForDatabase('user-1', 'octocat', 'hello-world', null);
        expect(data.access_token).toBeNull();
    });

    it('throws 400 when repo_owner is empty', () => {
        expect(() => GithubSource.createForDatabase('user-1', '', 'hello-world', null)).toThrow(AppError);
        try {
            GithubSource.createForDatabase('user-1', '', 'hello-world', null);
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(400);
            expect(e.message).toBe('Repo owner cannot be empty.');
        }
    });

    it('throws 400 when repo_owner is whitespace only', () => {
        expect(() => GithubSource.createForDatabase('user-1', '   ', 'hello-world', null)).toThrow(AppError);
    });

    it('throws 400 when repo_owner exceeds 255 chars', () => {
        const longOwner = 'a'.repeat(256);
        try {
            GithubSource.createForDatabase('user-1', longOwner, 'hello-world', null);
            fail('expected error');
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(400);
            expect(e.message).toBe('Repo owner is too long.');
        }
    });

    it('throws 400 when repo_name is empty', () => {
        try {
            GithubSource.createForDatabase('user-1', 'octocat', '', null);
            fail('expected error');
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(400);
            expect(e.message).toBe('Repo name cannot be empty.');
        }
    });

    it('throws 400 when repo_name is whitespace only', () => {
        expect(() => GithubSource.createForDatabase('user-1', 'octocat', '   ', null)).toThrow(AppError);
    });

    it('throws 400 when repo_name exceeds 255 chars', () => {
        const longName = 'b'.repeat(256);
        try {
            GithubSource.createForDatabase('user-1', 'octocat', longName, null);
            fail('expected error');
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(400);
            expect(e.message).toBe('Repo name is too long.');
        }
    });
});

describe('GithubSource.restore', () => {
    it('returns a GithubSource instance on happy path', () => {
        const src = makeSource();
        expect(src).toBeInstanceOf(GithubSource);
        expect(src.id).toBe('src-1');
        expect(src.user_id).toBe('user-1');
        expect(src.repo_owner).toBe('octocat');
        expect(src.repo_name).toBe('hello-world');
        expect(src.access_token).toBe('tok');
        expect(src.created_at).toBe(NOW);
        expect(src.updated_at).toBe(LATER);
    });

    it('restores with null access_token', () => {
        const src = makeSource({ access_token: null });
        expect(src.access_token).toBeNull();
    });

    it('throws 400 when repo_owner is invalid', () => {
        expect(() =>
            GithubSource.restore('src-1', 'user-1', '', 'hello-world', null, NOW, LATER),
        ).toThrow(AppError);
    });

    it('throws 400 when repo_name is invalid', () => {
        expect(() =>
            GithubSource.restore('src-1', 'user-1', 'octocat', '', null, NOW, LATER),
        ).toThrow(AppError);
    });
});

describe('GithubSource.ensureOwnership', () => {
    it('does not throw when actorId matches user_id', () => {
        const src = makeSource({ user_id: 'user-1' });
        expect(() => src.ensureOwnership('user-1', 'delete')).not.toThrow();
    });

    it('throws 403 when actorId does not match user_id', () => {
        const src = makeSource({ user_id: 'user-1' });
        try {
            src.ensureOwnership('other-user', 'delete');
            fail('expected error');
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(403);
            expect(e.message).toBe('Forbidden.');
        }
    });
});
