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
import { ControllerConnectionCreate } from '../../../../src/modules/connection/controllers/controller.connection.create';
import { ControllerConnectionListActive } from '../../../../src/modules/connection/controllers/controller.connection.list_active';
import { ControllerConnectionListDeleted } from '../../../../src/modules/connection/controllers/controller.connection.list_deleted';
import { ControllerConnectionUpdate } from '../../../../src/modules/connection/controllers/controller.connection.update';
import { ControllerConnectionSoftDelete } from '../../../../src/modules/connection/controllers/controller.connection.soft_delete';
import { ControllerConnectionRestore } from '../../../../src/modules/connection/controllers/controller.connection.restore';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionDto } from '../../../../src/modules/connection/dto/connection.dto';

const jwtService = JwtTokenService.create();
const extractor = UserIdExtractor.create();

function bearerFor(userId: string) {
    return `Bearer ${jwtService.generateAccessToken(userId)}`;
}

const ACTOR_AUTH = bearerFor('actor-uuid');

const NOW = new Date().toISOString();

const CONN_DTO: ConnectionDto = {
    id: 'conn-uuid-1',
    user_id: 'actor-uuid',
    provider: 'telegram',
    name: 'My Bot',
    credentials: { provider: 'telegram', bot_token: 'tok', chat_id: 'chat' },
    created_at: NOW,
    updated_at: NOW,
    is_deleted: false,
};

function mockCreateSvc(overrides: Partial<{ createConnectionService: jest.Mock }> = {}) {
    return { createConnectionService: jest.fn().mockResolvedValue(CONN_DTO), ...overrides } as any;
}
function mockListActiveSvc(overrides: Partial<{ listActiveConnectionsService: jest.Mock }> = {}) {
    return { listActiveConnectionsService: jest.fn().mockResolvedValue([CONN_DTO]), ...overrides } as any;
}
function mockListDeletedSvc(overrides: Partial<{ listDeletedConnectionsService: jest.Mock }> = {}) {
    return { listDeletedConnectionsService: jest.fn().mockResolvedValue([{ ...CONN_DTO, is_deleted: true }]), ...overrides } as any;
}
function mockUpdateSvc(overrides: Partial<{ updateConnectionService: jest.Mock }> = {}) {
    return { updateConnectionService: jest.fn().mockResolvedValue(CONN_DTO), ...overrides } as any;
}
function mockSoftDeleteSvc(overrides: Partial<{ softDeleteConnectionService: jest.Mock }> = {}) {
    return { softDeleteConnectionService: jest.fn().mockResolvedValue(undefined), ...overrides } as any;
}
function mockRestoreSvc(overrides: Partial<{ restoreConnectionService: jest.Mock }> = {}) {
    return { restoreConnectionService: jest.fn().mockResolvedValue({ ...CONN_DTO, is_deleted: false }), ...overrides } as any;
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
        controllerConnectionCreate: ControllerConnectionCreate.create(mockCreateSvc(), extractor),
        controllerConnectionListActive: ControllerConnectionListActive.create(mockListActiveSvc(), extractor),
        controllerConnectionListDeleted: ControllerConnectionListDeleted.create(mockListDeletedSvc(), extractor),
        controllerConnectionUpdate: ControllerConnectionUpdate.create(mockUpdateSvc(), extractor),
        controllerConnectionSoftDelete: ControllerConnectionSoftDelete.create(mockSoftDeleteSvc(), extractor),
        controllerConnectionRestore: ControllerConnectionRestore.create(mockRestoreSvc(), extractor),
        controllerGithubSourceCreate: { createSourceCont: jest.fn() } as any,
        controllerGithubSourceList: { listSourcesCont: jest.fn() } as any,
        controllerGithubSourceDelete: { deleteSourceCont: jest.fn() } as any,
        controllerSubscriptionCreate: { createSubscriptionCont: jest.fn() } as any,
        controllerSubscriptionList: { listSubscriptionsCont: jest.fn() } as any,
        controllerSubscriptionDelete: { deleteSubscriptionCont: jest.fn() } as any,
        controllerReportConfigCreate: { createReportConfigCont: jest.fn() } as any,
        controllerReportConfigList: { listReportConfigsCont: jest.fn() } as any,
        controllerReportConfigDelete: { deleteReportConfigCont: jest.fn() } as any,
        controllerReportGenerate: { generateReportCont: jest.fn() } as any,
        ...overrides,
    } as DepsContainer;
}

describe('Connection controllers e2e', () => {

    describe('POST /protected/connections', () => {
        it('returns 201 with connection DTO on success', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/connections')
                .set('Authorization', ACTOR_AUTH)
                .send({ name: 'My Bot', credentials: { provider: 'telegram', bot_token: 'tok', chat_id: 'c' } });
            expect(res.status).toBe(201);
            expect(res.body.connection.id).toBe('conn-uuid-1');
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            const res = await request(app).post('/protected/connections').send({ name: 'x', credentials: {} });
            expect(res.status).toBe(401);
        });

        it('returns 400 when body is missing name', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/connections')
                .set('Authorization', ACTOR_AUTH)
                .send({ credentials: { provider: 'telegram', bot_token: 't', chat_id: 'c' } });
            expect(res.status).toBe(400);
        });

        it('propagates AppError from service', async () => {
            const app = createApp(buildContainer({
                controllerConnectionCreate: ControllerConnectionCreate.create(
                    mockCreateSvc({ createConnectionService: jest.fn().mockRejectedValue(new AppError('Bad creds', 400, 'test')) }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .post('/protected/connections')
                .set('Authorization', ACTOR_AUTH)
                .send({ name: 'Bot', credentials: { provider: 'telegram', bot_token: 't', chat_id: 'c' } });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /protected/connections', () => {
        it('returns 200 with list of active connections', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .get('/protected/connections')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(200);
            expect(res.body.connections).toHaveLength(1);
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            expect((await request(app).get('/protected/connections')).status).toBe(401);
        });
    });

    describe('GET /protected/connections/deleted', () => {
        it('returns 200 with list of deleted connections', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .get('/protected/connections/deleted')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(200);
            expect(res.body.connections[0].is_deleted).toBe(true);
        });
    });

    describe('PATCH /protected/connections/:id', () => {
        it('returns 200 with updated connection', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .patch('/protected/connections/conn-uuid-1')
                .set('Authorization', ACTOR_AUTH)
                .send({ name: 'New Name' });
            expect(res.status).toBe(200);
            expect(res.body.connection).toBeDefined();
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            expect((await request(app).patch('/protected/connections/x').send({ name: 'x' })).status).toBe(401);
        });

        it('returns 403 when service throws 403 AppError', async () => {
            const app = createApp(buildContainer({
                controllerConnectionUpdate: ControllerConnectionUpdate.create(
                    mockUpdateSvc({ updateConnectionService: jest.fn().mockRejectedValue(new AppError('Forbidden.', 403, 'test')) }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .patch('/protected/connections/conn-uuid-1')
                .set('Authorization', ACTOR_AUTH)
                .send({ name: 'x' });
            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /protected/connections/:id', () => {
        it('returns 204 on success', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .delete('/protected/connections/conn-uuid-1')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(204);
        });

        it('returns 401 without auth', async () => {
            expect((await request(createApp(buildContainer())).delete('/protected/connections/x')).status).toBe(401);
        });
    });

    describe('POST /protected/connections/:id/restore', () => {
        it('returns 200 with restored connection', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/connections/conn-uuid-1/restore')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(200);
            expect(res.body.connection.is_deleted).toBe(false);
        });

        it('returns 401 without auth', async () => {
            expect((await request(createApp(buildContainer())).post('/protected/connections/x/restore')).status).toBe(401);
        });
    });
});
