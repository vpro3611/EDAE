import { SubscriptionListUseCase } from '../../../../src/modules/subscription/usecases/subscription.list.usecase';
import { SubscriptionDtoMapper } from '../../../../src/modules/subscription/dto/subscription.dto.mapper';
import { GithubSourceRepoReaderInterface } from '../../../../src/modules/github_source/interfaces/interface.repository';
import { SubscriptionRepoReaderInterface } from '../../../../src/modules/subscription/interfaces/interface.repository';
import { GithubSource } from '../../../../src/modules/github_source/entity/github_source';
import { Subscription } from '../../../../src/modules/subscription/entity/subscription';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { SubscriptionEventType } from '../../../../src/modules/subscription/subscription.event_types';

const NOW = new Date('2024-01-01T00:00:00.000Z');
const LATER = new Date('2024-06-01T00:00:00.000Z');
const EVENT_TYPE: SubscriptionEventType = 'issue_opened';

function makeSource(userId = 'user-1'): GithubSource {
    return GithubSource.restore('src-1', userId, 'octocat', 'hello-world', null, NOW, LATER);
}

function makeSub(id = 'sub-1', eventType: SubscriptionEventType = EVENT_TYPE): Subscription {
    return Subscription.restore(
        id, 'src-1', eventType, 'conn-1', 'Notification: {{event}}',
        {}, null as unknown as Record<string, unknown>, true, NOW, LATER,
    );
}

describe('SubscriptionListUseCase', () => {
    let sourceReader: jest.Mocked<GithubSourceRepoReaderInterface>;
    let reader: jest.Mocked<SubscriptionRepoReaderInterface>;
    let mapper: SubscriptionDtoMapper;
    let useCase: SubscriptionListUseCase;

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
        mapper = SubscriptionDtoMapper.create();
        useCase = SubscriptionListUseCase.create(sourceReader, reader, mapper);
    });

    it('returns mapped DTOs when source exists and ownership matches', async () => {
        const subs = [makeSub('sub-1', 'new_release'), makeSub('sub-2', 'pr_opened')];
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));
        reader.getSubscriptionsBySourceId.mockResolvedValue(subs);

        const dtos = await useCase.execute('user-1', 'src-1');

        expect(dtos).toHaveLength(2);
        expect(dtos[0].id).toBe('sub-1');
        expect(dtos[0].event_type).toBe('new_release');
        expect(dtos[1].id).toBe('sub-2');
        expect(dtos[1].event_type).toBe('pr_opened');
    });

    it('calls sourceReader.getSourceById with the sourceId', async () => {
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));
        reader.getSubscriptionsBySourceId.mockResolvedValue([]);

        await useCase.execute('user-1', 'src-1');
        expect(sourceReader.getSourceById).toHaveBeenCalledWith('src-1');
    });

    it('calls reader.getSubscriptionsBySourceId with the sourceId', async () => {
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));
        reader.getSubscriptionsBySourceId.mockResolvedValue([makeSub()]);

        await useCase.execute('user-1', 'src-1');
        expect(reader.getSubscriptionsBySourceId).toHaveBeenCalledWith('src-1');
    });

    it('returns empty array when no subscriptions exist', async () => {
        sourceReader.getSourceById.mockResolvedValue(makeSource('user-1'));
        reader.getSubscriptionsBySourceId.mockResolvedValue([]);

        const dtos = await useCase.execute('user-1', 'src-1');
        expect(dtos).toEqual([]);
    });

    it('throws 404 when source is not found', async () => {
        sourceReader.getSourceById.mockResolvedValue(null);

        await expect(
            useCase.execute('user-1', 'src-missing'),
        ).rejects.toBeInstanceOf(AppError);

        try {
            await useCase.execute('user-1', 'src-missing');
        } catch (e: any) {
            expect(e.statusCode).toBe(404);
            expect(e.message).toBe('GitHub source not found.');
        }

        expect(reader.getSubscriptionsBySourceId).not.toHaveBeenCalled();
    });

    it('throws 403 when ownership fails', async () => {
        sourceReader.getSourceById.mockResolvedValue(makeSource('owner-user'));

        await expect(
            useCase.execute('other-user', 'src-1'),
        ).rejects.toBeInstanceOf(AppError);

        try {
            await useCase.execute('other-user', 'src-1');
        } catch (e: any) {
            expect(e.statusCode).toBe(403);
        }

        expect(reader.getSubscriptionsBySourceId).not.toHaveBeenCalled();
    });
});
