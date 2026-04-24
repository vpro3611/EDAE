import request from "supertest";
import { createApp } from "../../../../src/app";
import { DepsContainer } from "../../../../src/container";
import { JwtTokenService } from "../../../../src/modules/authentification/jwt/service/jwt.token_service";
import { RegisterRequestController } from "../../../../src/modules/authentification/controllers/controller.register_request";
import { ControllerRegisterConfirm } from "../../../../src/modules/authentification/controllers/controller.register_confirm";
import { ControllerLoginEmail } from "../../../../src/modules/authentification/controllers/controller.login_email";
import { ControllerRefresh } from "../../../../src/modules/authentification/controllers/controller.refresh";
import { ControllerLogout } from "../../../../src/modules/authentification/controllers/controller.logout";
import { AppError } from "../../../../src/modules/errors/errors.global";
import { UserDtoForSelf } from "../../../../src/modules/user/dto/user.dto";

const NOW = new Date().toISOString();
const SELF_DTO: UserDtoForSelf = {
    id: "uuid-1", name: "Alice", email: "alice@example.com",
    created_at: NOW, updated_at: NOW, is_verified: true,
};

function buildContainer(overrides: Partial<DepsContainer> = {}): DepsContainer {
    const jwtTokenService = JwtTokenService.create();

    const authService = {
        registerRequest: jest.fn<Promise<void>, [string, string, string]>().mockResolvedValue(undefined),
        registerConfirm: jest.fn().mockResolvedValue({
            user: SELF_DTO, accessToken: "access-token", refreshToken: "refresh-token",
        }),
        loginEmail: jest.fn().mockResolvedValue({
            loggedUser: SELF_DTO, accessToken: "access-token", refreshToken: "refresh-token",
        }),
        refresh: jest.fn().mockResolvedValue({
            user: SELF_DTO, accessToken: "new-access", refreshToken: "new-refresh",
        }),
        logout: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
    } as any;

    const noopCtrl = { getSelfProfileCont: jest.fn(), getOtherProfileCont: jest.fn() } as any;
    const noopTxCtrl = (method: string) => ({ [method]: jest.fn() } as any);

    return {
        jwtTokenService,
        controllerRegisterRequest: RegisterRequestController.create(authService),
        controllerRegisterConfirm: ControllerRegisterConfirm.create(authService),
        controllerLoginEmail: ControllerLoginEmail.create(authService),
        controllerRefresh: ControllerRefresh.create(authService),
        controllerLogout: ControllerLogout.create(authService),
        controllerGetSelfProfile: noopCtrl,
        controllerGetOtherProfile: noopCtrl,
        controllerChangePassword: noopTxCtrl("changePasswordCont"),
        controllerUpdateName: noopTxCtrl("updateNameCont"),
        controllerRequestEmailChange: noopTxCtrl("requestEmailChangeCont"),
        controllerConfirmEmailChange: noopTxCtrl("confirmEmailChangeCont"),
        controllerRequestPasswordReset: noopTxCtrl("requestPasswordResetCont"),
        controllerConfirmPasswordReset: noopTxCtrl("confirmPasswordResetCont"),
        controllerRequestAccountDeletion: noopTxCtrl("requestAccountDeletionCont"),
        controllerConfirmAccountDeletion: noopTxCtrl("confirmAccountDeletionCont"),
        ...overrides,
    } as DepsContainer;
}

describe("Auth controllers e2e", () => {
    describe("POST /pub/auth/register", () => {
        it("returns 201 and status message on valid body", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/auth/register")
                .send({ name: "Alice", email: "alice@example.com", password: "Pass123!" });

            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({ status: expect.stringContaining("email confirmation") });
        });

        it("returns 400 when body fails schema validation", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/auth/register")
                .send({ name: "Alice" }); // missing email and password

            expect(res.status).toBe(400);
        });

        it("returns 400 when email format is invalid", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/auth/register")
                .send({ name: "Alice", email: "not-an-email", password: "Pass123!" });

            expect(res.status).toBe(400);
        });

        it("propagates AppError from the service", async () => {
            const container = buildContainer();
            (container.controllerRegisterRequest as any) = RegisterRequestController.create({
                registerRequest: jest.fn().mockRejectedValue(
                    new AppError("Email already in use.", 409, "Test")
                ),
            } as any);
            const app = createApp(container);

            const res = await request(app)
                .post("/pub/auth/register")
                .send({ name: "Alice", email: "alice@example.com", password: "Pass123!" });

            expect(res.status).toBe(409);
            expect(res.body.message).toBe("Email already in use.");
        });
    });

    describe("POST /pub/auth/register/confirm", () => {
        it("returns 200 with user and tokens, sets refreshToken cookie", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/auth/register/confirm")
                .send({ email: "alice@example.com", otp: "123456" });

            expect(res.status).toBe(200);
            expect(res.body.user.id).toBe("uuid-1");
            expect(res.body.accessToken).toBe("access-token");
            const setCookie = res.headers["set-cookie"] as unknown as string[];
            expect(setCookie?.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
        });

        it("returns 400 when body is missing otp", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/auth/register/confirm")
                .send({ email: "alice@example.com" });

            expect(res.status).toBe(400);
        });
    });

    describe("POST /pub/auth/login", () => {
        it("returns 200 with accessToken and user, sets refreshToken cookie", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/auth/login")
                .send({ email: "alice@example.com", password: "Pass123!" });

            expect(res.status).toBe(200);
            expect(res.body.accessToken).toBe("access-token");
            expect(res.body.user.email).toBe("alice@example.com");
            const setCookie = res.headers["set-cookie"] as unknown as string[];
            expect(setCookie?.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
        });

        it("returns 400 when body fails schema validation", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/auth/login")
                .send({ email: "alice@example.com" }); // missing password

            expect(res.status).toBe(400);
        });

        it("propagates 401 AppError for wrong credentials", async () => {
            const container = buildContainer();
            (container.controllerLoginEmail as any) = ControllerLoginEmail.create({
                loginEmail: jest.fn().mockRejectedValue(
                    new AppError("Invalid credentials.", 401, "Test")
                ),
            } as any);
            const app = createApp(container);

            const res = await request(app)
                .post("/pub/auth/login")
                .send({ email: "alice@example.com", password: "wrong" });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Invalid credentials.");
        });
    });

    describe("POST /pub/auth/refresh", () => {
        it("returns 200 with new accessToken and rotates cookie", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/auth/refresh")
                .set("Cookie", "refreshToken=valid-refresh-token");

            expect(res.status).toBe(200);
            expect(res.body.accessToken).toBe("new-access");
            expect(res.body.user.id).toBe("uuid-1");
            const setCookie = res.headers["set-cookie"] as unknown as string[];
            expect(setCookie?.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
        });

        it("returns 401 when refreshToken cookie is absent", async () => {
            const app = createApp(buildContainer());

            const res = await request(app).post("/pub/auth/refresh");

            expect(res.status).toBe(401);
        });

        it("propagates AppError from the service", async () => {
            const container = buildContainer();
            (container.controllerRefresh as any) = ControllerRefresh.create({
                refresh: jest.fn().mockRejectedValue(
                    new AppError("Refresh token has expired.", 401, "Test")
                ),
            } as any);
            const app = createApp(container);

            const res = await request(app)
                .post("/pub/auth/refresh")
                .set("Cookie", "refreshToken=expired-token");

            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Refresh token has expired.");
        });
    });

    describe("POST /pub/auth/logout", () => {
        it("returns 200 and clears the refreshToken cookie", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/auth/logout")
                .set("Cookie", "refreshToken=some-token");

            expect(res.status).toBe(200);
            const setCookie = res.headers["set-cookie"] as unknown as string[];
            expect(setCookie?.some((c: string) => c.includes("refreshToken=;") || c.includes("refreshToken=;") || c.includes("Expires=Thu, 01 Jan 1970"))).toBe(true);
        });

        it("returns 401 when refreshToken cookie is absent", async () => {
            const app = createApp(buildContainer());

            const res = await request(app).post("/pub/auth/logout");

            expect(res.status).toBe(401);
        });
    });
});
