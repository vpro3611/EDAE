import { SubscriptionCreateUseCase } from '../../../../src/modules/subscription/usecases/subscription.create.usecase';
import { SubscriptionDtoMapper } from '../../../../src/modules/subscription/dto/subscription.dto.mapper';
import { GithubSourceRepoReaderInterface } from '../../../../src/modules/github_source/interfaces/interface.repository';
import { SubscriptionRepoWriterInterface } from '../../../../src/modules/subscription/interfaces/interface.repository';
import { GithubSource } from '../../../../src/modules/github_source/entity/github_source';
import { Subscription } from '../../../../src/modules/subscription/entity/subscription';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { SubscriptionEventType } from '../../../../src/modules/subscription/subscription.event_types';

jest.mock('@octokit/rest', () => ({
    Octokit: jest.fn().mockImplementation(() => ({
        repos: {
            get: jest.fn().mockResolvedValue({
                data: { stargazers_count: 5, forks_count: 2 },
            }),
        },
    })),
}));

const NOW = new Date('2024-01-01T00:00:00.000Z');
const LATER = new Date('2024-06-01T00:00:00.000Z');
const EVENT_TYPE: SubscriptionEventType = 'new_release';

function makeSource(userId = 'user-1'): GithubSource {
    return GithubSource.restore('src-1', userId, 'octocat', 'hello-world', null, NOW, LATER);
}

function makeSub(): Subscription {
    return Subscription.restore(
        'sub-1', 'src-1', EVENT_TYPE, 'conn-1', 'Hello {{repo}}',
        { key: 'val' }, null as unknown as Record<string, unknown>, true, NOW, LATER,
    );
}

describe('SubscriptionCreateUseCase', () => {
    let sourceReader: jest.Mocked<GithubSourceRepoReaderInterface>;
    let writer: jest.Mocked<SubscriptionRepoWriterInterface>;
    let mapper: SubscriptionDtoMapper;
    let useCase: SubscriptionCreateUseCase;

    beforeEach(() => {
        sourceReader = {
            getSourceById: jest.fn(),
            getSourcesByUserId: jest.fn(),
        };
        writer = {
            createSubscription: jest.fn(),
            deleteSubscription: jest.fn(),
            updateLastSeen: jest.fn(),
        };
        mapper = SubscriptionDtoMapper.create();
        useCase = SubscriptionCreateUseCase.create(sourceReader, writer, mapper);
    });

    it('returns a DTO on success when source exists and ownership matches', async () => {
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));
        writer.createSubscription.mockResolvedValue(makeSub());

        const dto = await useCase.execute('user-1', 'src-1', EVENT_TYPE, 'conn-1', 'Hello {{repo}}', { key: 'val' });

        expect(dto.id).toBe('sub-1');
        expect(dto.github_source_id).toBe('src-1');
        expect(dto.event_type).toBe(EVENT_TYPE);
        expect(dto.connection_id).toBe('conn-1');
        expect(dto.message_template).toBe('Hello {{repo}}');
        expect(dto.is_active).toBe(true);
    });

    it('calls sourceReader.getSourceById with the githubSourceId', async () => {
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));
        writer.createSubscription.mockResolvedValue(makeSub());

        await useCase.execute('user-1', 'src-1', EVENT_TYPE, 'conn-1', 'Hello {{repo}}', {});
        expect(sourceReader.getSourceById).toHaveBeenCalledWith('src-1');
    });

    it('calls writer.createSubscription with correct data', async () => {
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));
        writer.createSubscription.mockResolvedValue(makeSub());

        await useCase.execute('user-1', 'src-1', EVENT_TYPE, 'conn-1', 'Hello {{repo}}', { key: 'val' });

        expect(writer.createSubscription).toHaveBeenCalledWith({
            github_source_id: 'src-1',
            event_type: EVENT_TYPE,
            connection_id: 'conn-1',
            message_template: 'Hello {{repo}}',
            config: { key: 'val' },
        });
    });

    it('throws 404 when source is not found', async () => {
        sourceReader.getSourceById.mockResolvedValue(null);

        await expect(
            useCase.execute('user-1', 'src-missing', EVENT_TYPE, 'conn-1', 'Hello', {}),
        ).rejects.toBeInstanceOf(AppError);

        try {
            await useCase.execute('user-1', 'src-missing', EVENT_TYPE, 'conn-1', 'Hello', {});
        } catch (e: any) {
            expect(e.statusCode).toBe(404);
            expect(e.message).toBe('GitHub source not found.');
        }

        expect(writer.createSubscription).not.toHaveBeenCalled();
    });

    it('throws 403 when ownership fails (different user)', async () => {
        sourceReader.getSourceById.mockResolvedValue(makeSource('owner-user'));

        await expect(
            useCase.execute('other-user', 'src-1', EVENT_TYPE, 'conn-1', 'Hello', {}),
        ).rejects.toBeInstanceOf(AppError);

        try {
            await useCase.execute('other-user', 'src-1', EVENT_TYPE, 'conn-1', 'Hello', {});
        } catch (e: any) {
            expect(e.statusCode).toBe(403);
        }

        expect(writer.createSubscription).not.toHaveBeenCalled();
    });

    it('throws 400 when template is empty (before DB call)', async () => {
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));

        await expect(
            useCase.execute('user-1', 'src-1', EVENT_TYPE, 'conn-1', '', {}),
        ).rejects.toBeInstanceOf(AppError);

        try {
            await useCase.execute('user-1', 'src-1', EVENT_TYPE, 'conn-1', '', {});
        } catch (e: any) {
            expect(e.statusCode).toBe(400);
            expect(e.message).toBe('Message template cannot be empty.');
        }

        expect(writer.createSubscription).not.toHaveBeenCalled();
    });

    it('throws 400 when template is whitespace only (before DB call)', async () => {
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));

        await expect(
            useCase.execute('user-1', 'src-1', EVENT_TYPE, 'conn-1', '   ', {}),
        ).rejects.toBeInstanceOf(AppError);

        expect(writer.createSubscription).not.toHaveBeenCalled();
    });

    describe('milestone baseline seeding', () => {
        function makeSourceWithToken(userId = 'user-1'): GithubSource {
            return GithubSource.restore('src-1', userId, 'octocat', 'hello-world', 'token', NOW, LATER);
        }
        function makeMilleSub(eventType: SubscriptionEventType): Subscription {
            return Subscription.restore('sub-1', 'src-1', eventType, 'conn-1', 'tmpl', {}, {}, true, NOW, LATER);
        }

        it('seeds initial_last_seen with current star count for star_milestone', async () => {
            sourceReader.getSourceById.mockResolvedValue(makeSourceWithToken());
            writer.createSubscription.mockResolvedValue(makeMilleSub('star_milestone'));

            await useCase.execute('user-1', 'src-1', 'star_milestone', 'conn-1', 'tmpl', { milestone: 10 });

            expect(writer.createSubscription).toHaveBeenCalledWith(
                expect.objectContaining({
                    initial_last_seen: { stars: 5, __bootstrapped: true },
                }),
            );
        });

        it('seeds initial_last_seen with current fork count for fork_milestone', async () => {
            sourceReader.getSourceById.mockResolvedValue(makeSourceWithToken());
            writer.createSubscription.mockResolvedValue(makeMilleSub('fork_milestone'));

            await useCase.execute('user-1', 'src-1', 'fork_milestone', 'conn-1', 'tmpl', { milestone: 5 });

            expect(writer.createSubscription).toHaveBeenCalledWith(
                expect.objectContaining({
                    initial_last_seen: { forks: 2, __bootstrapped: true },
                }),
            );
        });

        it('creates subscription without initial_last_seen when GitHub API fails', async () => {
            const { Octokit } = require('@octokit/rest');
            Octokit.mockImplementationOnce(() => ({
                repos: { get: jest.fn().mockRejectedValue(new Error('network error')) },
            }));
            sourceReader.getSourceById.mockResolvedValue(makeSourceWithToken());
            writer.createSubscription.mockResolvedValue(makeMilleSub('star_milestone'));

            await useCase.execute('user-1', 'src-1', 'star_milestone', 'conn-1', 'tmpl', { milestone: 10 });

            const call = writer.createSubscription.mock.calls[0][0];
            expect(call.initial_last_seen).toBeUndefined();
        });

        it('does not seed initial_last_seen for non-milestone event types', async () => {
            sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));
            writer.createSubscription.mockResolvedValue(makeSub());

            await useCase.execute('user-1', 'src-1', 'new_commit', 'conn-1', 'Hello {{repo}}', {});

            const call = writer.createSubscription.mock.calls[0][0];
            expect(call.initial_last_seen).toBeUndefined();
        });
    });
});
