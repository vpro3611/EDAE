import { UserValidator } from "../../../../src/modules/user/entity/user.validator";
import { AppError } from "../../../../src/modules/errors/errors.global";

describe("UserValidator", () => {
    describe("validateName", () => {
        it("should not throw error for valid name", () => {
            expect(() => UserValidator.validateName("John Doe")).not.toThrow();
        });

        it("should throw AppError if name is too short", () => {
            expect(() => UserValidator.validateName("Jo")).toThrow(AppError);
            expect(() => UserValidator.validateName("Jo")).toThrow("Name must be between 3 and 255 characters long.");
        });

        it("should throw AppError if name contains '@'", () => {
            expect(() => UserValidator.validateName("John@Doe")).toThrow(AppError);
            expect(() => UserValidator.validateName("John@Doe")).toThrow("Name must not contain '@'.");
        });
    });

    describe("validateEmail", () => {
        it("should not throw error for valid email", () => {
            expect(() => UserValidator.validateEmail("test@example.com")).not.toThrow();
        });

        it("should throw AppError for invalid email format", () => {
            expect(() => UserValidator.validateEmail("invalid-email")).toThrow(AppError);
            expect(() => UserValidator.validateEmail("invalid-email")).toThrow("Email must be a valid email address.");
        });
    });

    describe("validatePassword", () => {
        it("should not throw error for valid strong password", () => {
            // Password must be at least 12 chars, have upper, lower, number, special char
            expect(() => UserValidator.validatePassword("StrongPass123!")).not.toThrow();
        });

        it("should throw AppError for weak password (missing special char)", () => {
            expect(() => UserValidator.validatePassword("WeakPass12345")).toThrow(AppError);
            expect(() => UserValidator.validatePassword("WeakPass12345")).toThrow(
                "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
            );
        });

        it("should throw AppError if password is 10 characters", () => {
            expect(() => UserValidator.validatePassword("StrongP123!")).toThrow(AppError);
            expect(() => UserValidator.validatePassword("StrongP123!")).toThrow("Password must be between 12 and 255 characters long.");
        });

        it("should throw AppError if password is too short", () => {
            expect(() => UserValidator.validatePassword("Short1!")).toThrow(AppError);
            expect(() => UserValidator.validatePassword("Short1!")).toThrow("Password must be between 12 and 255 characters long.");
        });
    });

    describe("validationPipeline", () => {
        it("should not throw for valid inputs", () => {
            expect(() => UserValidator.validationPipeline("John Doe", "test@example.com", "StrongPass123!")).not.toThrow();
        });

        it("should throw if any input is invalid", () => {
            expect(() => UserValidator.validationPipeline("Jo", "test@example.com", "StrongPass123!")).toThrow(AppError);
            expect(() => UserValidator.validationPipeline("John Doe", "invalid", "StrongPass123!")).toThrow(AppError);
            expect(() => UserValidator.validationPipeline("John Doe", "test@example.com", "weak")).toThrow(AppError);
        });
    });
});
