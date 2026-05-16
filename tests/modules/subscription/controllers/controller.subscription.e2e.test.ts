import request from 'supertest';

jest.mock('../../../../src/redis', () => ({ REDIS: {} }));
jest.mock('../../../../src/api_limiter', () => ({
    preDefinedPublicLimiters: () => ({}),
    constructMiddlewareWrapper: () => (_req: any, _res: any, next: any) => next(),
}));

import { createApp } from '../../../../src/app';
import { DepsContainer } from '../../../../src/container';
import { JwtTokenService } from '../../../../src/modules/authentification/jwt/service/jwt.token_service';
import { UserIdExtractor } from '../../../../src/modules/authentification/extractor.extract_user_id';
import { ControllerSubscriptionCreate } from '../../../../src/modules/subscription/controllers/controller.subscription.create';
import { ControllerSubscriptionList } from '../../../../src/modules/subscription/controllers/controller.subscription.list';
import { ControllerSubscriptionDelete } from '../../../../src/modules/subscription/controllers/controller.subscription.delete';
import { AppError } from '../../../../src/modules/errors/errors.global';

const jwtService = JwtTokenService.create();
const extractor = UserIdExtractor.create();

function bearerFor(userId: string) {
    return `Bearer ${jwtService.generateAccessToken(userId)}`;
}

const ACTOR_AUTH = bearerFor('actor-uuid');

const NOW = new Date().toISOString();

const SUB_DTO = {
    id: 'sub-uuid-1',
    github_source_id: 'src-uuid-1',
    event_type: 'new_release',
    connection_id: 'conn-uuid-1',
    message_template: 'New release!',
    config: {},
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
};

function mockCreateSvc(overrides: Partial<{ createSubscriptionService: jest.Mock }> = {}) {
    return { createSubscriptionService: jest.fn().mockResolvedValue(SUB_DTO), ...overrides } as any;
}
function mockListSvc(overrides: Partial<{ listSubscriptionsService: jest.Mock }> = {}) {
    return { listSubscriptionsService: jest.fn().mockResolvedValue([SUB_DTO]), ...overrides } as any;
}
function mockDeleteSvc(overrides: Partial<{ deleteSubscriptionService: jest.Mock }> = {}) {
    return { deleteSubscriptionService: jest.fn().mockResolvedValue(undefined), ...overrides } as any;
}

function buildContainer(overrides: Partial<DepsContainer> = {}): DepsContainer {
    const noopAuth = { registerRequestCont: jest.fn(), registerConfirmCont: jest.fn() } as any;

    return {
        jwtTokenService: jwtService,
        controllerRegisterRequest: noopAuth,
        controllerRegisterConfirm: noopAuth,
        controllerLoginEmail: { loginEmailCont: jest.fn() } as any,
        controllerRefresh: { refreshCont: jest.fn() } as any,
        controllerLogout: { logoutCont: jest.fn() } as any,
        controllerGoogleLogin: { googleLoginCont: jest.fn() } as any,
        controllerChangePassword: { changePasswordCont: jest.fn() } as any,
        controllerUpdateName: { updateNameCont: jest.fn() } as any,
        controllerRequestEmailChange: { requestEmailChangeCont: jest.fn() } as any,
        controllerConfirmEmailChange: { confirmEmailChangeCont: jest.fn() } as any,
        controllerRequestPasswordReset: { requestPasswordResetCont: jest.fn() } as any,
        controllerConfirmPasswordReset: { confirmPasswordResetCont: jest.fn() } as any,
        controllerRequestAccountDeletion: { requestAccountDeletionCont: jest.fn() } as any,
        controllerConfirmAccountDeletion: { confirmAccountDeletionCont: jest.fn() } as any,
        controllerGetSelfProfile: { getSelfProfileCont: jest.fn() } as any,
        controllerGetOtherProfile: { getOtherProfileCont: jest.fn() } as any,
        controllerConnectionCreate: { createConnectionCont: jest.fn() } as any,
        controllerConnectionListActive: { listActiveConnectionsCont: jest.fn() } as any,
        controllerConnectionListDeleted: { listDeletedConnectionsCont: jest.fn() } as any,
        controllerConnectionUpdate: { updateConnectionCont: jest.fn() } as any,
        controllerConnectionSoftDelete: { softDeleteConnectionCont: jest.fn() } as any,
        controllerConnectionRestore: { restoreConnectionCont: jest.fn() } as any,
        controllerGithubSourceCreate: { createSourceCont: jest.fn() } as any,
        controllerGithubSourceList: { listSourcesCont: jest.fn() } as any,
        controllerGithubSourceDelete: { deleteSourceCont: jest.fn() } as any,
        controllerSubscriptionCreate: ControllerSubscriptionCreate.create(mockCreateSvc(), extractor),
        controllerSubscriptionList: ControllerSubscriptionList.create(mockListSvc(), extractor),
        controllerSubscriptionDelete: ControllerSubscriptionDelete.create(mockDeleteSvc(), extractor),
        controllerReportConfigCreate: { createReportConfigCont: jest.fn() } as any,
        controllerReportConfigList: { listReportConfigsCont: jest.fn() } as any,
        controllerReportConfigDelete: { deleteReportConfigCont: jest.fn() } as any,
        controllerReportGenerate: { generateReportCont: jest.fn() } as any,
        logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), http: jest.fn() } as any,
        metrics: { httpRequestDuration: { observe: jest.fn() }, userRegistrations: { inc: jest.fn() }, userLogins: { inc: jest.fn() }, reportsGenerated: { inc: jest.fn() }, getMetrics: jest.fn().mockResolvedValue(''), getContentType: jest.fn().mockReturnValue('text/plain') } as any,
        ...overrides,
    } as DepsContainer;
}

const VALID_CREATE_BODY = {
    github_source_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    event_type: 'new_release',
    connection_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    message_template: 'New release available!',
    config: {},
};

describe('Subscription controllers e2e', () => {

    describe('POST /protected/subscriptions', () => {
        it('returns 201 with subscription DTO on success', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/subscriptions')
                .set('Authorization', ACTOR_AUTH)
                .send(VALID_CREATE_BODY);
            expect(res.status).toBe(201);
            expect(res.body.subscription.id).toBe('sub-uuid-1');
            expect(res.body.subscription.event_type).toBe('new_release');
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/subscriptions')
                .send(VALID_CREATE_BODY);
            expect(res.status).toBe(401);
        });

        it('returns 400 when event_type is invalid', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/subscriptions')
                .set('Authorization', ACTOR_AUTH)
                .send({ ...VALID_CREATE_BODY, event_type: 'invalid_event' });
            expect(res.status).toBe(400);
        });

        it('returns 400 when github_source_id is not a UUID', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/subscriptions')
                .set('Authorization', ACTOR_AUTH)
                .send({ ...VALID_CREATE_BODY, github_source_id: 'not-a-uuid' });
            expect(res.status).toBe(400);
        });

        it('returns 400 when github_source_id is missing', async () => {
            const app = createApp(buildContainer());
            const { github_source_id: _, ...bodyWithoutSourceId } = VALID_CREATE_BODY;
            const res = await request(app)
                .post('/protected/subscriptions')
                .set('Authorization', ACTOR_AUTH)
                .send(bodyWithoutSourceId);
            expect(res.status).toBe(400);
        });

        it('returns 400 when message_template is missing', async () => {
            const app = createApp(buildContainer());
            const { message_template: _, ...bodyWithoutTemplate } = VALID_CREATE_BODY;
            const res = await request(app)
                .post('/protected/subscriptions')
                .set('Authorization', ACTOR_AUTH)
                .send(bodyWithoutTemplate);
            expect(res.status).toBe(400);
        });

        it('returns 400 when message_template is empty string', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/subscriptions')
                .set('Authorization', ACTOR_AUTH)
                .send({ ...VALID_CREATE_BODY, message_template: '' });
            expect(res.status).toBe(400);
        });

        it('propagates 403 AppError from service', async () => {
            const app = createApp(buildContainer({
                controllerSubscriptionCreate: ControllerSubscriptionCreate.create(
                    mockCreateSvc({ createSubscriptionService: jest.fn().mockRejectedValue(new AppError('Forbidden.', 403, 'test')) }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .post('/protected/subscriptions')
                .set('Authorization', ACTOR_AUTH)
                .send(VALID_CREATE_BODY);
            expect(res.status).toBe(403);
        });

        it('propagates 404 AppError from service', async () => {
            const app = createApp(buildContainer({
                controllerSubscriptionCreate: ControllerSubscriptionCreate.create(
                    mockCreateSvc({ createSubscriptionService: jest.fn().mockRejectedValue(new AppError('Source not found.', 404, 'test')) }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .post('/protected/subscriptions')
                .set('Authorization', ACTOR_AUTH)
                .send(VALID_CREATE_BODY);
            expect(res.status).toBe(404);
        });
    });

    describe('GET /protected/subscriptions', () => {
        it('returns 200 with list of subscriptions', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .get('/protected/subscriptions')
                .query({ source_id: 'src-uuid-1' })
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(200);
            expect(res.body.subscriptions).toHaveLength(1);
            expect(res.body.subscriptions[0].id).toBe('sub-uuid-1');
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .get('/protected/subscriptions')
                .query({ source_id: 'src-uuid-1' });
            expect(res.status).toBe(401);
        });

        it('returns 400 when source_id query param is missing', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .get('/protected/subscriptions')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(400);
        });

        it('propagates AppError from service', async () => {
            const app = createApp(buildContainer({
                controllerSubscriptionList: ControllerSubscriptionList.create(
                    mockListSvc({ listSubscriptionsService: jest.fn().mockRejectedValue(new AppError('Source not found.', 404, 'test')) }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .get('/protected/subscriptions')
                .query({ source_id: 'nonexistent-src' })
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /protected/subscriptions/:id', () => {
        it('returns 204 on success', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .delete('/protected/subscriptions/sub-uuid-1')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(204);
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .delete('/protected/subscriptions/sub-uuid-1');
            expect(res.status).toBe(401);
        });

        it('propagates 403 AppError from service', async () => {
            const app = createApp(buildContainer({
                controllerSubscriptionDelete: ControllerSubscriptionDelete.create(
                    mockDeleteSvc({ deleteSubscriptionService: jest.fn().mockRejectedValue(new AppError('Forbidden.', 403, 'test')) }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .delete('/protected/subscriptions/sub-uuid-1')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(403);
        });

        it('propagates 404 AppError from service', async () => {
            const app = createApp(buildContainer({
                controllerSubscriptionDelete: ControllerSubscriptionDelete.create(
                    mockDeleteSvc({ deleteSubscriptionService: jest.fn().mockRejectedValue(new AppError('Subscription not found.', 404, 'test')) }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .delete('/protected/subscriptions/nonexistent-sub')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(404);
        });
    });
});
