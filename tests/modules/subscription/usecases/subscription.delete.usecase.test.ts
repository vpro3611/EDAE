import { SubscriptionDeleteUseCase } from '../../../../src/modules/subscription/usecases/subscription.delete.usecase';
import { GithubSourceRepoReaderInterface } from '../../../../src/modules/github_source/interfaces/interface.repository';
import { SubscriptionRepoReaderInterface, SubscriptionRepoWriterInterface } from '../../../../src/modules/subscription/interfaces/interface.repository';
import { GithubSource } from '../../../../src/modules/github_source/entity/github_source';
import { Subscription } from '../../../../src/modules/subscription/entity/subscription';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { SubscriptionEventType } from '../../../../src/modules/subscription/subscription.event_types';

const NOW = new Date('2024-01-01T00:00:00.000Z');
const LATER = new Date('2024-06-01T00:00:00.000Z');
const EVENT_TYPE: SubscriptionEventType = 'new_commit';

function makeSource(userId = 'user-1'): GithubSource {
    return GithubSource.restore('src-1', userId, 'octocat', 'hello-world', null, NOW, LATER);
}

function makeSub(sourceId = 'src-1'): Subscription {
    return Subscription.restore(
        'sub-1', sourceId, EVENT_TYPE, 'conn-1', 'New commit in {{repo}}',
        {}, null as unknown as Record<string, unknown>, true, NOW, LATER,
    );
}

describe('SubscriptionDeleteUseCase', () => {
    let sourceReader: jest.Mocked<GithubSourceRepoReaderInterface>;
    let reader: jest.Mocked<SubscriptionRepoReaderInterface>;
    let writer: jest.Mocked<SubscriptionRepoWriterInterface>;
    let useCase: SubscriptionDeleteUseCase;

    beforeEach(() => {
        sourceReader = {
            getSourceById: jest.fn(),
            getSourcesByUserId: jest.fn(),
        };
        reader = {
            getSubscriptionById: jest.fn(),
            getSubscriptionsBySourceId: jest.fn(),
            getActiveSubscriptions: jest.fn(),
        };
        writer = {
            createSubscription: jest.fn(),
            deleteSubscription: jest.fn(),
            updateLastSeen: jest.fn(),
        };
        useCase = SubscriptionDeleteUseCase.create(sourceReader, reader, writer);
    });

    it('deletes subscription on success path', async () => {
        reader.getSubscriptionById.mockResolvedValue(makeSub());
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));
        writer.deleteSubscription.mockResolvedValue(undefined);

        await expect(useCase.execute('user-1', 'sub-1')).resolves.toBeUndefined();
        expect(writer.deleteSubscription).toHaveBeenCalledWith('sub-1');
    });

    it('calls reader.getSubscriptionById with subscriptionId', async () => {
        reader.getSubscriptionById.mockResolvedValue(makeSub());
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));
        writer.deleteSubscription.mockResolvedValue(undefined);

        await useCase.execute('user-1', 'sub-1');
        expect(reader.getSubscriptionById).toHaveBeenCalledWith('sub-1');
    });

    it('calls sourceReader.getSourceById with subscription.github_source_id', async () => {
        const sub = makeSub('src-1');
        reader.getSubscriptionById.mockResolvedValue(sub);
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));
        writer.deleteSubscription.mockResolvedValue(undefined);

        await useCase.execute('user-1', 'sub-1');
        expect(sourceReader.getSourceById).toHaveBeenCalledWith('src-1');
    });

    it('throws 404 when subscription is not found', async () => {
        reader.getSubscriptionById.mockResolvedValue(null);

        await expect(useCase.execute('user-1', 'sub-missing')).rejects.toBeInstanceOf(AppError);

        try {
            await useCase.execute('user-1', 'sub-missing');
        } catch (e: any) {
            expect(e.statusCode).toBe(404);
            expect(e.message).toBe('Subscription not found.');
        }

        expect(writer.deleteSubscription).not.toHaveBeenCalled();
        expect(sourceReader.getSourceById).not.toHaveBeenCalled();
    });

    it('throws 404 when source is not found (subscription exists but source deleted)', async () => {
        reader.getSubscriptionById.mockResolvedValue(makeSub());
        sourceReader.getSourceById.mockResolvedValue(null);

        await expect(useCase.execute('user-1', 'sub-1')).rejects.toBeInstanceOf(AppError);

        try {
            await useCase.execute('user-1', 'sub-1');
        } catch (e: any) {
            expect(e.statusCode).toBe(404);
            expect(e.message).toBe('GitHub source not found.');
        }

        expect(writer.deleteSubscription).not.toHaveBeenCalled();
    });

    it('throws 403 when ownership fails', async () => {
        reader.getSubscriptionById.mockResolvedValue(makeSub());
        sourceReader.getSourceById.mockResolvedValue(makeSource('owner-user'));

        await expect(useCase.execute('other-user', 'sub-1')).rejects.toBeInstanceOf(AppError);

        try {
            await useCase.execute('other-user', 'sub-1');
        } catch (e: any) {
            expect(e.statusCode).toBe(403);
        }

        expect(writer.deleteSubscription).not.toHaveBeenCalled();
    });

    it('does not call deleteSubscription on 404 for subscription', async () => {
        reader.getSubscriptionById.mockResolvedValue(null);

        try { await useCase.execute('user-1', 'sub-1'); } catch { /* expected */ }
        expect(writer.deleteSubscription).not.toHaveBeenCalled();
    });

    it('does not call deleteSubscription on 404 for source', async () => {
        reader.getSubscriptionById.mockResolvedValue(makeSub());
        sourceReader.getSourceById.mockResolvedValue(null);

        try { await useCase.execute('user-1', 'sub-1'); } catch { /* expected */ }
        expect(writer.deleteSubscription).not.toHaveBeenCalled();
    });

    it('does not call deleteSubscription on 403 ownership error', async () => {
        reader.getSubscriptionById.mockResolvedValue(makeSub());
        sourceReader.getSourceById.mockResolvedValue(makeSource('owner-user'));

        try { await useCase.execute('other-user', 'sub-1'); } catch { /* expected */ }
        expect(writer.deleteSubscription).not.toHaveBeenCalled();
    });
});
