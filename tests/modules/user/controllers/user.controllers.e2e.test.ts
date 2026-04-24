import request from "supertest";
import { createApp } from "../../../../src/app";
import { DepsContainer } from "../../../../src/container";
import { JwtTokenService } from "../../../../src/modules/authentification/jwt/service/jwt.token_service";
import { UserIdExtractor } from "../../../../src/modules/authentification/extractor.extract_user_id";
import { ControllerChangePassword } from "../../../../src/modules/user/controllers/controller.change_password";
import { ControllerUpdateName } from "../../../../src/modules/user/controllers/controller.update_name";
import { ControllerRequestEmailChange } from "../../../../src/modules/user/controllers/controller.request_email_change";
import { ControllerConfirmEmailChange } from "../../../../src/modules/user/controllers/controller.confirm_email_change";
import { ControllerRequestPasswordReset } from "../../../../src/modules/user/controllers/controller.request_password_reset";
import { ControllerConfirmPasswordReset } from "../../../../src/modules/user/controllers/controller.confirm_password_reset";
import { ControllerRequestAccountDeletion } from "../../../../src/modules/user/controllers/controller.request_account_deletion";
import { ControllerConfirmAccountDeletion } from "../../../../src/modules/user/controllers/controller.confirm_account_deletion";
import { ControllerGetSelfProfile } from "../../../../src/modules/user/controllers/controller.get_self_profile";
import { ControllerGetOtherProfile } from "../../../../src/modules/user/controllers/controller.get_other_profile";
import { AppError } from "../../../../src/modules/errors/errors.global";
import { UserDtoForSelf, UserDtoForOthers } from "../../../../src/modules/user/dto/user.dto";

// ── shared fixtures ──────────────────────────────────────────────────────────

const NOW = new Date().toISOString();

const SELF_DTO: UserDtoForSelf = {
    id: "uuid-actor", name: "Alice", email: "alice@example.com",
    created_at: NOW, updated_at: NOW, is_verified: true,
};

const OTHER_DTO: UserDtoForOthers = {
    id: "uuid-target", name: "Bob",
    created_at: NOW, updated_at: NOW,
};

// ── auth helper ───────────────────────────────────────────────────────────────

const jwtService = JwtTokenService.create();

function bearerFor(userId: string): string {
    return `Bearer ${jwtService.generateAccessToken(userId)}`;
}

const ACTOR_AUTH = bearerFor("uuid-actor");

// ── mock tx-service factories ────────────────────────────────────────────────

function mockChangePwService(overrides: Partial<{ changePasswordService: jest.Mock }> = {}) {
    return { changePasswordService: jest.fn().mockResolvedValue(undefined), ...overrides } as any;
}

function mockUpdateNameService(overrides: Partial<{ updateNameService: jest.Mock }> = {}) {
    return { updateNameService: jest.fn().mockResolvedValue(SELF_DTO), ...overrides } as any;
}

function mockReqEmailChangeService(overrides: Partial<{ requestEmailChangeService: jest.Mock }> = {}) {
    return { requestEmailChangeService: jest.fn().mockResolvedValue(undefined), ...overrides } as any;
}

function mockConfEmailChangeService(overrides: Partial<{ confirmEmailChangeService: jest.Mock }> = {}) {
    return { confirmEmailChangeService: jest.fn().mockResolvedValue(SELF_DTO), ...overrides } as any;
}

function mockReqPwResetService(overrides: Partial<{ requestPasswordResetService: jest.Mock }> = {}) {
    return { requestPasswordResetService: jest.fn().mockResolvedValue(undefined), ...overrides } as any;
}

function mockConfPwResetService(overrides: Partial<{ confirmPasswordResetService: jest.Mock }> = {}) {
    return { confirmPasswordResetService: jest.fn().mockResolvedValue(undefined), ...overrides } as any;
}

function mockReqAccDeletionService(overrides: Partial<{ requestAccountDeletionService: jest.Mock }> = {}) {
    return { requestAccountDeletionService: jest.fn().mockResolvedValue(undefined), ...overrides } as any;
}

function mockConfAccDeletionService(overrides: Partial<{ confirmAccountDeletionService: jest.Mock }> = {}) {
    return { confirmAccountDeletionService: jest.fn().mockResolvedValue(undefined), ...overrides } as any;
}

function mockGetSelfProfileService(overrides: Partial<{ getSelfProfileService: jest.Mock }> = {}) {
    return { getSelfProfileService: jest.fn().mockResolvedValue(SELF_DTO), ...overrides } as any;
}

function mockGetOtherProfileService(overrides: Partial<{ getOtherProfileService: jest.Mock }> = {}) {
    return { getOtherProfileService: jest.fn().mockResolvedValue(OTHER_DTO), ...overrides } as any;
}

// ── container builder ─────────────────────────────────────────────────────────

function buildContainer(overrides: Partial<DepsContainer> = {}): DepsContainer {
    const extractor = UserIdExtractor.create();

    const noopAuthCtrl = { registerRequestCont: jest.fn(), registerConfirmCont: jest.fn() } as any;

    return {
        jwtTokenService: jwtService,

        // auth controllers (not under test here — use noops)
        controllerRegisterRequest: noopAuthCtrl,
        controllerRegisterConfirm: noopAuthCtrl,
        controllerLoginEmail: { loginEmailCont: jest.fn() } as any,
        controllerRefresh: { refreshCont: jest.fn() } as any,
        controllerLogout: { logoutCont: jest.fn() } as any,

        // user controllers — real instances wrapping mock services
        controllerChangePassword: ControllerChangePassword.create(mockChangePwService(), extractor),
        controllerUpdateName: ControllerUpdateName.create(mockUpdateNameService(), extractor),
        controllerRequestEmailChange: ControllerRequestEmailChange.create(mockReqEmailChangeService(), extractor),
        controllerConfirmEmailChange: ControllerConfirmEmailChange.create(mockConfEmailChangeService(), extractor),
        controllerRequestPasswordReset: ControllerRequestPasswordReset.create(mockReqPwResetService()),
        controllerConfirmPasswordReset: ControllerConfirmPasswordReset.create(mockConfPwResetService()),
        controllerRequestAccountDeletion: ControllerRequestAccountDeletion.create(mockReqAccDeletionService(), extractor),
        controllerConfirmAccountDeletion: ControllerConfirmAccountDeletion.create(mockConfAccDeletionService(), extractor),
        controllerGetSelfProfile: ControllerGetSelfProfile.create(mockGetSelfProfileService(), extractor),
        controllerGetOtherProfile: ControllerGetOtherProfile.create(mockGetOtherProfileService(), extractor),

        ...overrides,
    } as DepsContainer;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("User controllers e2e", () => {

    // ── PATCH /protected/user/password ────────────────────────────────────────

    describe("PATCH /protected/user/password", () => {
        it("returns 200 on successful password change", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .patch("/protected/user/password")
                .set("Authorization", ACTOR_AUTH)
                .send({ oldPassword: "OldPass1!", newPassword: "NewPass1!" });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Password changed successfully.");
        });

        it("returns 401 when Authorization header is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .patch("/protected/user/password")
                .send({ oldPassword: "OldPass1!", newPassword: "NewPass1!" });

            expect(res.status).toBe(401);
        });

        it("returns 400 when oldPassword is missing from body", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .patch("/protected/user/password")
                .set("Authorization", ACTOR_AUTH)
                .send({ newPassword: "NewPass1!" });

            expect(res.status).toBe(400);
        });

        it("returns 400 when newPassword is missing from body", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .patch("/protected/user/password")
                .set("Authorization", ACTOR_AUTH)
                .send({ oldPassword: "OldPass1!" });

            expect(res.status).toBe(400);
        });

        it("propagates AppError from the service", async () => {
            const extractor = UserIdExtractor.create();
            const container = buildContainer({
                controllerChangePassword: ControllerChangePassword.create(
                    mockChangePwService({
                        changePasswordService: jest.fn().mockRejectedValue(
                            new AppError("Old password is incorrect.", 400, "Test")
                        ),
                    }),
                    extractor
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .patch("/protected/user/password")
                .set("Authorization", ACTOR_AUTH)
                .send({ oldPassword: "WrongPass!", newPassword: "NewPass1!" });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Old password is incorrect.");
        });
    });

    // ── PATCH /protected/user/name ────────────────────────────────────────────

    describe("PATCH /protected/user/name", () => {
        it("returns 200 with updated user DTO", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .patch("/protected/user/name")
                .set("Authorization", ACTOR_AUTH)
                .send({ name: "Alice Updated" });

            expect(res.status).toBe(200);
            expect(res.body.user.id).toBe("uuid-actor");
        });

        it("returns 401 when Authorization header is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .patch("/protected/user/name")
                .send({ name: "Alice Updated" });

            expect(res.status).toBe(401);
        });

        it("returns 400 when name is missing from body", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .patch("/protected/user/name")
                .set("Authorization", ACTOR_AUTH)
                .send({});

            expect(res.status).toBe(400);
        });

        it("propagates AppError from the service", async () => {
            const extractor = UserIdExtractor.create();
            const container = buildContainer({
                controllerUpdateName: ControllerUpdateName.create(
                    mockUpdateNameService({
                        updateNameService: jest.fn().mockRejectedValue(
                            new AppError("Name must be between 2 and 50 characters.", 400, "Test")
                        ),
                    }),
                    extractor
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .patch("/protected/user/name")
                .set("Authorization", ACTOR_AUTH)
                .send({ name: "X" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("Name must be between");
        });
    });

    // ── POST /protected/user/email-change ─────────────────────────────────────

    describe("POST /protected/user/email-change", () => {
        it("returns 200 with confirmation message", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/email-change")
                .set("Authorization", ACTOR_AUTH)
                .send({ newEmail: "newalice@example.com" });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain("verification code");
        });

        it("returns 401 when Authorization header is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/email-change")
                .send({ newEmail: "newalice@example.com" });

            expect(res.status).toBe(401);
        });

        it("returns 400 when newEmail is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/email-change")
                .set("Authorization", ACTOR_AUTH)
                .send({});

            expect(res.status).toBe(400);
        });

        it("returns 400 when newEmail is not a valid email address", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/email-change")
                .set("Authorization", ACTOR_AUTH)
                .send({ newEmail: "not-an-email" });

            expect(res.status).toBe(400);
        });

        it("propagates AppError from the service", async () => {
            const extractor = UserIdExtractor.create();
            const container = buildContainer({
                controllerRequestEmailChange: ControllerRequestEmailChange.create(
                    mockReqEmailChangeService({
                        requestEmailChangeService: jest.fn().mockRejectedValue(
                            new AppError("Email already in use.", 409, "Test")
                        ),
                    }),
                    extractor
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .post("/protected/user/email-change")
                .set("Authorization", ACTOR_AUTH)
                .send({ newEmail: "taken@example.com" });

            expect(res.status).toBe(409);
            expect(res.body.message).toBe("Email already in use.");
        });
    });

    // ── POST /protected/user/email-change/confirm ─────────────────────────────

    describe("POST /protected/user/email-change/confirm", () => {
        it("returns 200 with updated user DTO", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/email-change/confirm")
                .set("Authorization", ACTOR_AUTH)
                .send({ otp: "123456" });

            expect(res.status).toBe(200);
            expect(res.body.user.id).toBe("uuid-actor");
        });

        it("returns 401 when Authorization header is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/email-change/confirm")
                .send({ otp: "123456" });

            expect(res.status).toBe(401);
        });

        it("returns 400 when otp is missing from body", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/email-change/confirm")
                .set("Authorization", ACTOR_AUTH)
                .send({});

            expect(res.status).toBe(400);
        });

        it("propagates AppError when OTP is invalid", async () => {
            const extractor = UserIdExtractor.create();
            const container = buildContainer({
                controllerConfirmEmailChange: ControllerConfirmEmailChange.create(
                    mockConfEmailChangeService({
                        confirmEmailChangeService: jest.fn().mockRejectedValue(
                            new AppError("Invalid or expired verification code.", 400, "Test")
                        ),
                    }),
                    extractor
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .post("/protected/user/email-change/confirm")
                .set("Authorization", ACTOR_AUTH)
                .send({ otp: "wrong" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("verification code");
        });
    });

    // ── POST /protected/user/account-deletion ─────────────────────────────────

    describe("POST /protected/user/account-deletion", () => {
        it("returns 200 with confirmation message", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/account-deletion")
                .set("Authorization", ACTOR_AUTH);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain("verification code");
        });

        it("returns 401 when Authorization header is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/account-deletion");

            expect(res.status).toBe(401);
        });

        it("propagates AppError from the service", async () => {
            const extractor = UserIdExtractor.create();
            const container = buildContainer({
                controllerRequestAccountDeletion: ControllerRequestAccountDeletion.create(
                    mockReqAccDeletionService({
                        requestAccountDeletionService: jest.fn().mockRejectedValue(
                            new AppError("User not found.", 404, "Test")
                        ),
                    }),
                    extractor
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .post("/protected/user/account-deletion")
                .set("Authorization", ACTOR_AUTH);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("User not found.");
        });
    });

    // ── POST /protected/user/account-deletion/confirm ─────────────────────────

    describe("POST /protected/user/account-deletion/confirm", () => {
        it("returns 200 with success message", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/account-deletion/confirm")
                .set("Authorization", ACTOR_AUTH)
                .send({ otp: "123456" });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Account deleted successfully.");
        });

        it("returns 401 when Authorization header is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/account-deletion/confirm")
                .send({ otp: "123456" });

            expect(res.status).toBe(401);
        });

        it("returns 400 when otp is missing from body", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/protected/user/account-deletion/confirm")
                .set("Authorization", ACTOR_AUTH)
                .send({});

            expect(res.status).toBe(400);
        });

        it("propagates AppError when OTP is invalid", async () => {
            const extractor = UserIdExtractor.create();
            const container = buildContainer({
                controllerConfirmAccountDeletion: ControllerConfirmAccountDeletion.create(
                    mockConfAccDeletionService({
                        confirmAccountDeletionService: jest.fn().mockRejectedValue(
                            new AppError("Invalid or expired verification code.", 400, "Test")
                        ),
                    }),
                    extractor
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .post("/protected/user/account-deletion/confirm")
                .set("Authorization", ACTOR_AUTH)
                .send({ otp: "wrong" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("verification code");
        });
    });

    // ── GET /protected/user/me ────────────────────────────────────────────────

    describe("GET /protected/user/me", () => {
        it("returns 200 with full self profile DTO", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .get("/protected/user/me")
                .set("Authorization", ACTOR_AUTH);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe("uuid-actor");
            expect(res.body.email).toBe("alice@example.com");
            expect(res.body.is_verified).toBe(true);
        });

        it("returns 401 when Authorization header is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app).get("/protected/user/me");

            expect(res.status).toBe(401);
        });

        it("propagates AppError when user is not found", async () => {
            const extractor = UserIdExtractor.create();
            const container = buildContainer({
                controllerGetSelfProfile: ControllerGetSelfProfile.create(
                    mockGetSelfProfileService({
                        getSelfProfileService: jest.fn().mockRejectedValue(
                            new AppError("User not found.", 404, "Test")
                        ),
                    }),
                    extractor
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .get("/protected/user/me")
                .set("Authorization", ACTOR_AUTH);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("User not found.");
        });

        it("propagates AppError when user is deleted", async () => {
            const extractor = UserIdExtractor.create();
            const container = buildContainer({
                controllerGetSelfProfile: ControllerGetSelfProfile.create(
                    mockGetSelfProfileService({
                        getSelfProfileService: jest.fn().mockRejectedValue(
                            new AppError("User already deleted.", 400, "Test")
                        ),
                    }),
                    extractor
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .get("/protected/user/me")
                .set("Authorization", ACTOR_AUTH);

            expect(res.status).toBe(400);
        });
    });

    // ── GET /protected/user/:targetId ─────────────────────────────────────────

    describe("GET /protected/user/:targetId", () => {
        it("returns 200 with other user DTO (no email, no is_verified)", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .get("/protected/user/uuid-target")
                .set("Authorization", ACTOR_AUTH);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe("uuid-target");
            expect(res.body.name).toBe("Bob");
            expect(res.body.email).toBeUndefined();
            expect(res.body.is_verified).toBeUndefined();
        });

        it("returns 401 when Authorization header is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app).get("/protected/user/uuid-target");

            expect(res.status).toBe(401);
        });

        it("propagates 400 AppError when actor and target are the same", async () => {
            const extractor = UserIdExtractor.create();
            const container = buildContainer({
                controllerGetOtherProfile: ControllerGetOtherProfile.create(
                    mockGetOtherProfileService({
                        getOtherProfileService: jest.fn().mockRejectedValue(
                            new AppError("You cannot view your own profile in this mode.", 400, "Test")
                        ),
                    }),
                    extractor
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .get("/protected/user/uuid-actor")
                .set("Authorization", ACTOR_AUTH);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("own profile");
        });

        it("propagates 404 AppError when target user is not found", async () => {
            const extractor = UserIdExtractor.create();
            const container = buildContainer({
                controllerGetOtherProfile: ControllerGetOtherProfile.create(
                    mockGetOtherProfileService({
                        getOtherProfileService: jest.fn().mockRejectedValue(
                            new AppError("User not found.", 404, "Test")
                        ),
                    }),
                    extractor
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .get("/protected/user/nonexistent-id")
                .set("Authorization", ACTOR_AUTH);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("User not found.");
        });
    });

    // ── POST /pub/user/password-reset ─────────────────────────────────────────

    describe("POST /pub/user/password-reset", () => {
        it("returns 200 with neutral message (even for non-existent email)", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/user/password-reset")
                .send({ email: "anyone@example.com" });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain("reset code has been sent");
        });

        it("returns 400 when email is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/user/password-reset")
                .send({});

            expect(res.status).toBe(400);
        });

        it("returns 400 when email format is invalid", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/user/password-reset")
                .send({ email: "not-an-email" });

            expect(res.status).toBe(400);
        });

        it("propagates AppError from the service", async () => {
            const container = buildContainer({
                controllerRequestPasswordReset: ControllerRequestPasswordReset.create(
                    mockReqPwResetService({
                        requestPasswordResetService: jest.fn().mockRejectedValue(
                            new AppError("User not found.", 404, "Test")
                        ),
                    })
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .post("/pub/user/password-reset")
                .send({ email: "ghost@example.com" });

            expect(res.status).toBe(404);
        });
    });

    // ── POST /pub/user/password-reset/confirm ─────────────────────────────────

    describe("POST /pub/user/password-reset/confirm", () => {
        it("returns 200 with success message", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/user/password-reset/confirm")
                .send({ email: "alice@example.com", otp: "123456", newPassword: "NewPass1!" });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Password reset successfully.");
        });

        it("returns 400 when email is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/user/password-reset/confirm")
                .send({ otp: "123456", newPassword: "NewPass1!" });

            expect(res.status).toBe(400);
        });

        it("returns 400 when otp is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/user/password-reset/confirm")
                .send({ email: "alice@example.com", newPassword: "NewPass1!" });

            expect(res.status).toBe(400);
        });

        it("returns 400 when newPassword is missing", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/user/password-reset/confirm")
                .send({ email: "alice@example.com", otp: "123456" });

            expect(res.status).toBe(400);
        });

        it("returns 400 when email format is invalid", async () => {
            const app = createApp(buildContainer());

            const res = await request(app)
                .post("/pub/user/password-reset/confirm")
                .send({ email: "bad-email", otp: "123456", newPassword: "NewPass1!" });

            expect(res.status).toBe(400);
        });

        it("propagates AppError when OTP is invalid or expired", async () => {
            const container = buildContainer({
                controllerConfirmPasswordReset: ControllerConfirmPasswordReset.create(
                    mockConfPwResetService({
                        confirmPasswordResetService: jest.fn().mockRejectedValue(
                            new AppError("Invalid or expired verification code.", 400, "Test")
                        ),
                    })
                ),
            });
            const app = createApp(container);

            const res = await request(app)
                .post("/pub/user/password-reset/confirm")
                .send({ email: "alice@example.com", otp: "wrong", newPassword: "NewPass1!" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("verification code");
        });
    });
});
