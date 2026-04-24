import {DepsContainer} from "./container";
import express, {Express} from "express";
import cookieParser from "cookie-parser";
import {authMiddleware} from "./modules/middlewares/middleware.auth";
import {validateBody} from "./modules/middlewares/middleware.validators";

// auth controllers
import { RegisterRequestBodySchema} from "./modules/authentification/controllers/controller.register_request";
import { RegisterConfirmRequestBodySchema} from "./modules/authentification/controllers/controller.register_confirm";
import { LoginEmailRequestBodySchema} from "./modules/authentification/controllers/controller.login_email";

// user controllers
import { ChangePasswordBodySchema} from "./modules/user/controllers/controller.change_password";
import { UpdateNameBodySchema} from "./modules/user/controllers/controller.update_name";
import { RequestEmailChangeBodySchema} from "./modules/user/controllers/controller.request_email_change";
import { ConfirmEmailChangeBodySchema} from "./modules/user/controllers/controller.confirm_email_change";
import { RequestPasswordResetBodySchema} from "./modules/user/controllers/controller.request_password_reset";
import { ConfirmPasswordResetBodySchema} from "./modules/user/controllers/controller.confirm_password_reset";
import { ConfirmAccountDeletionBodySchema} from "./modules/user/controllers/controller.confirm_account_deletion";

import {errorsMiddleware} from "./modules/middlewares/middleware.errors";

export function createApp(dependencies: DepsContainer): Express {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    const publicRouter = express.Router();
    const privateRouter = express.Router();

    app.use("/pub", publicRouter);
    app.use("/protected", privateRouter);

    privateRouter.use(authMiddleware(dependencies.jwtTokenService));

    publicRouter.get("/health", (req, res) => {
        res.status(200).json({message: "OK"});
    });

    publicRouter.post("/auth/register", validateBody(RegisterRequestBodySchema), dependencies.controllerRegisterRequest.registerRequestCont);
    publicRouter.post("/auth/register/confirm", validateBody(RegisterConfirmRequestBodySchema), dependencies.controllerRegisterConfirm.registerConfirmCont);
    publicRouter.post("/auth/login", validateBody(LoginEmailRequestBodySchema), dependencies.controllerLoginEmail.loginEmailCont);
    publicRouter.post("/auth/refresh", dependencies.controllerRefresh.refreshCont);
    publicRouter.post("/auth/logout", dependencies.controllerLogout.logoutCont);

    publicRouter.post("/user/password-reset", validateBody(RequestPasswordResetBodySchema), dependencies.controllerRequestPasswordReset.requestPasswordResetCont);
    publicRouter.post("/user/password-reset/confirm", validateBody(ConfirmPasswordResetBodySchema), dependencies.controllerConfirmPasswordReset.confirmPasswordResetCont);

    privateRouter.patch("/user/password", validateBody(ChangePasswordBodySchema), dependencies.controllerChangePassword.changePasswordCont);
    privateRouter.patch("/user/name", validateBody(UpdateNameBodySchema), dependencies.controllerUpdateName.updateNameCont);
    privateRouter.post("/user/email-change", validateBody(RequestEmailChangeBodySchema), dependencies.controllerRequestEmailChange.requestEmailChangeCont);
    privateRouter.post("/user/email-change/confirm", validateBody(ConfirmEmailChangeBodySchema), dependencies.controllerConfirmEmailChange.confirmEmailChangeCont);
    privateRouter.post("/user/account-deletion", dependencies.controllerRequestAccountDeletion.requestAccountDeletionCont);
    privateRouter.post("/user/account-deletion/confirm", validateBody(ConfirmAccountDeletionBodySchema), dependencies.controllerConfirmAccountDeletion.confirmAccountDeletionCont);

    privateRouter.get("/user/me", dependencies.controllerGetSelfProfile.getSelfProfileCont);
    privateRouter.get("/user/:targetId", dependencies.controllerGetOtherProfile.getOtherProfileCont);

    app.use(errorsMiddleware());

    return app;
}
