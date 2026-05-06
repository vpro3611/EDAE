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
import { ControllerGithubSourceCreate } from '../../../../src/modules/github_source/controllers/controller.github_source.create';
import { ControllerGithubSourceList } from '../../../../src/modules/github_source/controllers/controller.github_source.list';
import { ControllerGithubSourceDelete } from '../../../../src/modules/github_source/controllers/controller.github_source.delete';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { GithubSourceDto } from '../../../../src/modules/github_source/dto/github_source.dto';

const jwtService = JwtTokenService.create();
const extractor = UserIdExtractor.create();

function bearerFor(userId: string) {
    return `Bearer ${jwtService.generateAccessToken(userId)}`;
}

const ACTOR_AUTH = bearerFor('actor-uuid');

const NOW = new Date().toISOString();

const SOURCE_DTO: GithubSourceDto = {
    id: 'src-uuid-1',
    user_id: 'actor-uuid',
    repo_owner: 'octocat',
    repo_name: 'hello-world',
    has_token: false,
    created_at: NOW,
    updated_at: NOW,
};

const SOURCE_DTO_WITH_TOKEN: GithubSourceDto = {
    ...SOURCE_DTO,
    has_token: true,
};

function mockCreateSvc(overrides: Partial<{ createSourceService: jest.Mock }> = {}) {
    return { createSourceService: jest.fn().mockResolvedValue(SOURCE_DTO), ...overrides } as any;
}

function mockListSvc(overrides: Partial<{ listSourcesService: jest.Mock }> = {}) {
    return { listSourcesService: jest.fn().mockResolvedValue([SOURCE_DTO]), ...overrides } as any;
}

function mockDeleteSvc(overrides: Partial<{ deleteSourceService: jest.Mock }> = {}) {
    return { deleteSourceService: jest.fn().mockResolvedValue(undefined), ...overrides } as any;
}

function buildContainer(overrides: Partial<DepsContainer> = {}): DepsContainer {
    return {
        jwtTokenService: jwtService,
        controllerRegisterRequest: { registerRequestCont: jest.fn() } as any,
        controllerRegisterConfirm: { registerConfirmCont: jest.fn() } as any,
        controllerLoginEmail: { loginEmailCont: jest.fn() } as any,
        controllerRefresh: { refreshCont: jest.fn() } as any,
        controllerLogout: { logoutCont: jest.fn() } as any,
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
        controllerGithubSourceCreate: ControllerGithubSourceCreate.create(mockCreateSvc(), extractor),
        controllerGithubSourceList: ControllerGithubSourceList.create(mockListSvc(), extractor),
        controllerGithubSourceDelete: ControllerGithubSourceDelete.create(mockDeleteSvc(), extractor),
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

describe('GithubSource controllers e2e', () => {

    describe('POST /protected/github-sources', () => {
        it('returns 201 with source DTO on success', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/github-sources')
                .set('Authorization', ACTOR_AUTH)
                .send({ repo_owner: 'octocat', repo_name: 'hello-world' });

            expect(res.status).toBe(201);
            expect(res.body.source.id).toBe('src-uuid-1');
            expect(res.body.source.repo_owner).toBe('octocat');
            expect(res.body.source.repo_name).toBe('hello-world');
        });

        it('returns 201 with access_token provided', async () => {
            const app = createApp(buildContainer({
                controllerGithubSourceCreate: ControllerGithubSourceCreate.create(
                    mockCreateSvc({ createSourceService: jest.fn().mockResolvedValue(SOURCE_DTO_WITH_TOKEN) }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .post('/protected/github-sources')
                .set('Authorization', ACTOR_AUTH)
                .send({ repo_owner: 'octocat', repo_name: 'hello-world', access_token: 'ghp_tok' });

            expect(res.status).toBe(201);
            expect(res.body.source.has_token).toBe(true);
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/github-sources')
                .send({ repo_owner: 'octocat', repo_name: 'hello-world' });

            expect(res.status).toBe(401);
        });

        it('returns 400 when repo_owner is missing', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/github-sources')
                .set('Authorization', ACTOR_AUTH)
                .send({ repo_name: 'hello-world' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when repo_name is missing', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/github-sources')
                .set('Authorization', ACTOR_AUTH)
                .send({ repo_owner: 'octocat' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when repo_owner exceeds max length (255 chars)', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/github-sources')
                .set('Authorization', ACTOR_AUTH)
                .send({ repo_owner: 'a'.repeat(256), repo_name: 'hello-world' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when repo_name exceeds max length (255 chars)', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/github-sources')
                .set('Authorization', ACTOR_AUTH)
                .send({ repo_owner: 'octocat', repo_name: 'a'.repeat(256) });

            expect(res.status).toBe(400);
        });

        it('returns 400 when repo_owner is empty string', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/github-sources')
                .set('Authorization', ACTOR_AUTH)
                .send({ repo_owner: '', repo_name: 'hello-world' });

            expect(res.status).toBe(400);
        });

        it('propagates AppError from service', async () => {
            const app = createApp(buildContainer({
                controllerGithubSourceCreate: ControllerGithubSourceCreate.create(
                    mockCreateSvc({
                        createSourceService: jest.fn().mockRejectedValue(
                            new AppError('Source already exists.', 409, 'test'),
                        ),
                    }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .post('/protected/github-sources')
                .set('Authorization', ACTOR_AUTH)
                .send({ repo_owner: 'octocat', repo_name: 'hello-world' });

            expect(res.status).toBe(409);
        });
    });

    describe('GET /protected/github-sources', () => {
        it('returns 200 with list of sources', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .get('/protected/github-sources')
                .set('Authorization', ACTOR_AUTH);

            expect(res.status).toBe(200);
            expect(res.body.sources).toHaveLength(1);
            expect(res.body.sources[0].id).toBe('src-uuid-1');
        });

        it('returns 200 with empty array when no sources exist', async () => {
            const app = createApp(buildContainer({
                controllerGithubSourceList: ControllerGithubSourceList.create(
                    mockListSvc({ listSourcesService: jest.fn().mockResolvedValue([]) }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .get('/protected/github-sources')
                .set('Authorization', ACTOR_AUTH);

            expect(res.status).toBe(200);
            expect(res.body.sources).toHaveLength(0);
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            const res = await request(app).get('/protected/github-sources');

            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /protected/github-sources/:id', () => {
        it('returns 204 on success', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .delete('/protected/github-sources/src-uuid-1')
                .set('Authorization', ACTOR_AUTH);

            expect(res.status).toBe(204);
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            const res = await request(app).delete('/protected/github-sources/src-uuid-1');

            expect(res.status).toBe(401);
        });

        it('propagates 403 AppError when actor does not own the source', async () => {
            const app = createApp(buildContainer({
                controllerGithubSourceDelete: ControllerGithubSourceDelete.create(
                    mockDeleteSvc({
                        deleteSourceService: jest.fn().mockRejectedValue(
                            new AppError('Forbidden.', 403, 'test'),
                        ),
                    }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .delete('/protected/github-sources/src-uuid-1')
                .set('Authorization', ACTOR_AUTH);

            expect(res.status).toBe(403);
        });

        it('propagates 404 AppError when source does not exist', async () => {
            const app = createApp(buildContainer({
                controllerGithubSourceDelete: ControllerGithubSourceDelete.create(
                    mockDeleteSvc({
                        deleteSourceService: jest.fn().mockRejectedValue(
                            new AppError('Source not found.', 404, 'test'),
                        ),
                    }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .delete('/protected/github-sources/nonexistent-uuid')
                .set('Authorization', ACTOR_AUTH);

            expect(res.status).toBe(404);
        });
    });
});
