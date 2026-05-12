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
import { ControllerReportConfigCreate } from '../../../../src/modules/report/controllers/controller.report_config.create';
import { ControllerReportConfigList } from '../../../../src/modules/report/controllers/controller.report_config.list';
import { ControllerReportConfigDelete } from '../../../../src/modules/report/controllers/controller.report_config.delete';
import { ControllerReportGenerate } from '../../../../src/modules/report/controllers/controller.report.generate';
import { AppError } from '../../../../src/modules/errors/errors.global';

const jwtService = JwtTokenService.create();
const extractor = UserIdExtractor.create();
const ACTOR_ID = 'actor-uuid';
const AUTH = `Bearer ${jwtService.generateAccessToken(ACTOR_ID)}`;
const NOW = new Date().toISOString();
const CFG_DTO = { id: 'cfg-uuid', user_id: ACTOR_ID, connection_id: 'conn-uuid', frequency: 'weekly' as const, schedule_day: 3, is_active: true, last_sent_at: null, created_at: NOW, updated_at: NOW };

function buildContainer(overrides: Partial<DepsContainer> = {}): DepsContainer {
    const mockCreate = { createReportConfigService: jest.fn().mockResolvedValue(CFG_DTO) };
    const mockList = { listReportConfigsService: jest.fn().mockResolvedValue([CFG_DTO]) };
    const mockDelete = { deleteReportConfigService: jest.fn().mockResolvedValue(undefined) };
    const mockGenerate = { generateForConfig: jest.fn().mockResolvedValue(undefined) };
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
        controllerSubscriptionCreate: { createSubscriptionCont: jest.fn() } as any,
        controllerSubscriptionList: { listSubscriptionsCont: jest.fn() } as any,
        controllerSubscriptionDelete: { deleteSubscriptionCont: jest.fn() } as any,
        controllerReportConfigCreate: ControllerReportConfigCreate.create(mockCreate as any, extractor),
        controllerReportConfigList: ControllerReportConfigList.create(mockList as any, extractor),
        controllerReportConfigDelete: ControllerReportConfigDelete.create(mockDelete as any, extractor),
        controllerReportGenerate: ControllerReportGenerate.create(mockGenerate as any, extractor),
        ...overrides,
    } as DepsContainer;
}

describe('Report controllers e2e', () => {
    describe('POST /protected/report-configs', () => {
        it('returns 201 with created config', async () => {
            const res = await request(createApp(buildContainer()))
                .post('/protected/report-configs')
                .set('Authorization', AUTH)
                .send({ connection_id: 'a0000000-0000-4000-8000-000000000000', frequency: 'weekly', schedule_day: 3 });
            expect(res.status).toBe(201);
            expect(res.body.report_config.id).toBe('cfg-uuid');
        });
        it('returns 400 on invalid body', async () => {
            const res = await request(createApp(buildContainer()))
                .post('/protected/report-configs')
                .set('Authorization', AUTH)
                .send({ connection_id: 'not-a-uuid', frequency: 'hourly' });
            expect(res.status).toBe(400);
        });
        it('returns 401 without auth', async () => {
            const res = await request(createApp(buildContainer())).post('/protected/report-configs').send({});
            expect(res.status).toBe(401);
        });
    });

    describe('GET /protected/report-configs', () => {
        it('returns 200 with list', async () => {
            const res = await request(createApp(buildContainer()))
                .get('/protected/report-configs')
                .set('Authorization', AUTH);
            expect(res.status).toBe(200);
            expect(res.body.report_configs).toHaveLength(1);
        });
    });

    describe('DELETE /protected/report-configs/:id', () => {
        it('returns 204 on success', async () => {
            const res = await request(createApp(buildContainer()))
                .delete('/protected/report-configs/cfg-uuid')
                .set('Authorization', AUTH);
            expect(res.status).toBe(204);
        });
        it('propagates AppError from service', async () => {
            const mockDeleteErr = { deleteReportConfigService: jest.fn().mockRejectedValue(new AppError('Not found', 404, 'test')) };
            const res = await request(createApp(buildContainer({
                controllerReportConfigDelete: ControllerReportConfigDelete.create(mockDeleteErr as any, extractor),
            })))
                .delete('/protected/report-configs/cfg-uuid')
                .set('Authorization', AUTH);
            expect(res.status).toBe(404);
        });
    });

    describe('POST /protected/reports/generate', () => {
        it('returns 200 on success', async () => {
            const res = await request(createApp(buildContainer()))
                .post('/protected/reports/generate')
                .set('Authorization', AUTH)
                .send({ report_config_id: 'a0000000-0000-4000-8000-000000000000' });
            expect(res.status).toBe(200);
        });
        it('returns 400 on invalid body', async () => {
            const res = await request(createApp(buildContainer()))
                .post('/protected/reports/generate')
                .set('Authorization', AUTH)
                .send({ report_config_id: 'not-a-uuid' });
            expect(res.status).toBe(400);
        });
    });
});
