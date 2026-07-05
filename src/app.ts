import {DepsContainer} from "./container";
import express, {Express} from "express";
import cookieParser from "cookie-parser";
import cors, {CorsOptions} from "cors";
import {authMiddleware} from "./modules/middlewares/middleware.auth";
import {validateBody} from "./modules/middlewares/middleware.validators";

// auth controllers
import { RegisterRequestBodySchema} from "./modules/authentification/controllers/controller.register_request";
import { RegisterConfirmRequestBodySchema} from "./modules/authentification/controllers/controller.register_confirm";
import { LoginEmailRequestBodySchema} from "./modules/authentification/controllers/controller.login_email";
import { GoogleLoginBodySchema } from "./modules/authentification/controllers/controller.google_login";

// user controllers
import { ChangePasswordBodySchema} from "./modules/user/controllers/controller.change_password";
import { UpdateNameBodySchema} from "./modules/user/controllers/controller.update_name";
import { RequestEmailChangeBodySchema} from "./modules/user/controllers/controller.request_email_change";
import { ConfirmEmailChangeBodySchema} from "./modules/user/controllers/controller.confirm_email_change";
import { RequestPasswordResetBodySchema} from "./modules/user/controllers/controller.request_password_reset";
import { ConfirmPasswordResetBodySchema} from "./modules/user/controllers/controller.confirm_password_reset";
import { ConfirmAccountDeletionBodySchema} from "./modules/user/controllers/controller.confirm_account_deletion";
import { CreateConnectionBodySchema } from './modules/connection/controllers/controller.connection.create';
import { UpdateConnectionBodySchema } from './modules/connection/controllers/controller.connection.update';
import { CreateGithubSourceBodySchema } from './modules/github_source/controllers/controller.github_source.create';
import { CreateSubscriptionBodySchema } from './modules/subscription/controllers/controller.subscription.create';
import { CreateReportConfigBodySchema } from './modules/report/controllers/controller.report_config.create';
import { GenerateReportBodySchema } from './modules/report/controllers/controller.report.generate';

// middlewares
import {errorsMiddleware} from "./modules/middlewares/middleware.errors";
import { loggingMiddleware } from "./modules/middlewares/middleware.logging";
import { metricsMiddleware } from "./modules/middlewares/middleware.metrics";
import { constructMiddlewareWrapper, preDefinedPublicLimiters} from "./api_limiter";

export function createApp(dependencies: DepsContainer): Express {
    const app = express();
    app.set("trust proxy", 1);

    app.use(loggingMiddleware(dependencies.logger));
    app.use(metricsMiddleware(dependencies.metrics));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    const publicRouter = express.Router();
    const privateRouter = express.Router();
    const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:9000",
        process.env.FRONTEND_URL!,
    ];

    const corsOptions: CorsOptions = {
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        },
        credentials: true,
    };

    app.use(cors(corsOptions));

    app.use("/pub", publicRouter);
    app.use("/protected", privateRouter);

    privateRouter.use(authMiddleware(dependencies.jwtTokenService));

    const buckets = preDefinedPublicLimiters();

    publicRouter.get("/health", constructMiddlewareWrapper(buckets.healthCheckTokenBucket, "ip", "h:health"),
        (req, res) => {
        res.status(200).json({message: "OK"});
    });


    publicRouter.get("/metrics", constructMiddlewareWrapper(buckets.metricsCheckTokenBucket, "ip", "m:metrics"),
        async (req, res) => {
            res.set('Content-Type', dependencies.metrics.getContentType());
            res.end(await dependencies.metrics.getMetrics());
    });



    publicRouter.post(
        "/auth/register",
        validateBody(RegisterRequestBodySchema),
        constructMiddlewareWrapper(buckets.registerTokenBucket, 'email+ip', 'rl:register'),
        dependencies.controllerRegisterRequest.registerRequestCont
    );
    publicRouter.post(
        "/auth/register/confirm",
        validateBody(RegisterConfirmRequestBodySchema),
        constructMiddlewareWrapper(buckets.registerConfirmTokenBucket, 'email+ip', 'rl:register-confirm'),
        dependencies.controllerRegisterConfirm.registerConfirmCont
    );
    publicRouter.post(
        "/auth/login",
        validateBody(LoginEmailRequestBodySchema),
        constructMiddlewareWrapper(buckets.loginTokenBucket, 'email+ip', 'rl:login'),
        dependencies.controllerLoginEmail.loginEmailCont
    );
    publicRouter.post(
        "/auth/google",
        validateBody(GoogleLoginBodySchema),
        dependencies.controllerGoogleLogin.googleLoginCont
    );
    publicRouter.post(
        "/auth/refresh",
        constructMiddlewareWrapper(buckets.refreshTokenBucket, 'cookieToken', 'rl:refresh'),
        dependencies.controllerRefresh.refreshCont
    );
    publicRouter.post(
        "/auth/logout",
        constructMiddlewareWrapper(buckets.logoutTokenBucket, 'ip', 'rl:logout'),
        dependencies.controllerLogout.logoutCont
    );

    publicRouter.post(
        "/user/password-reset",
        validateBody(RequestPasswordResetBodySchema),
        constructMiddlewareWrapper(buckets.passwordResetTokenBucket, 'email+ip', 'rl:pw-reset'),
        dependencies.controllerRequestPasswordReset.requestPasswordResetCont
    );
    publicRouter.post(
        "/user/password-reset/confirm",
        validateBody(ConfirmPasswordResetBodySchema),
        constructMiddlewareWrapper(buckets.passwordResetConfirmTokenBucket, 'email+ip', 'rl:pw-reset-confirm'),
        dependencies.controllerConfirmPasswordReset.confirmPasswordResetCont
    );

    privateRouter.patch("/user/password", validateBody(ChangePasswordBodySchema), dependencies.controllerChangePassword.changePasswordCont);
    privateRouter.patch("/user/name", validateBody(UpdateNameBodySchema), dependencies.controllerUpdateName.updateNameCont);
    privateRouter.post("/user/email-change", validateBody(RequestEmailChangeBodySchema), dependencies.controllerRequestEmailChange.requestEmailChangeCont);
    privateRouter.post("/user/email-change/confirm", validateBody(ConfirmEmailChangeBodySchema), dependencies.controllerConfirmEmailChange.confirmEmailChangeCont);
    privateRouter.post("/user/account-deletion", dependencies.controllerRequestAccountDeletion.requestAccountDeletionCont);
    privateRouter.post("/user/account-deletion/confirm", validateBody(ConfirmAccountDeletionBodySchema), dependencies.controllerConfirmAccountDeletion.confirmAccountDeletionCont);

    privateRouter.get("/user/me", dependencies.controllerGetSelfProfile.getSelfProfileCont);
    privateRouter.get("/user/:targetId", dependencies.controllerGetOtherProfile.getOtherProfileCont);

    // connection routes
    privateRouter.post('/connections', validateBody(CreateConnectionBodySchema), dependencies.controllerConnectionCreate.createConnectionCont);
    privateRouter.get('/connections', dependencies.controllerConnectionListActive.listActiveConnectionsCont);
    privateRouter.get('/connections/deleted', dependencies.controllerConnectionListDeleted.listDeletedConnectionsCont);
    privateRouter.patch('/connections/:id', validateBody(UpdateConnectionBodySchema), dependencies.controllerConnectionUpdate.updateConnectionCont);
    privateRouter.delete('/connections/:id', dependencies.controllerConnectionSoftDelete.softDeleteConnectionCont);
    privateRouter.post('/connections/:id/restore', dependencies.controllerConnectionRestore.restoreConnectionCont);

    // github source routes
    privateRouter.post('/github-sources', validateBody(CreateGithubSourceBodySchema), dependencies.controllerGithubSourceCreate.createSourceCont);
    privateRouter.get('/github-sources', dependencies.controllerGithubSourceList.listSourcesCont);
    privateRouter.delete('/github-sources/:id', dependencies.controllerGithubSourceDelete.deleteSourceCont);

    // subscription routes
    privateRouter.post('/subscriptions', validateBody(CreateSubscriptionBodySchema), dependencies.controllerSubscriptionCreate.createSubscriptionCont);
    privateRouter.get('/subscriptions', dependencies.controllerSubscriptionList.listSubscriptionsCont);
    privateRouter.delete('/subscriptions/:id', dependencies.controllerSubscriptionDelete.deleteSubscriptionCont);

    // report routes
    privateRouter.post('/report-configs', validateBody(CreateReportConfigBodySchema), dependencies.controllerReportConfigCreate.createReportConfigCont);
    privateRouter.get('/report-configs', dependencies.controllerReportConfigList.listReportConfigsCont);
    privateRouter.delete('/report-configs/:id', dependencies.controllerReportConfigDelete.deleteReportConfigCont);
    privateRouter.post('/reports/generate', validateBody(GenerateReportBodySchema), dependencies.controllerReportGenerate.generateReportCont);

    app.use(errorsMiddleware(dependencies.logger));

    return app;
}
