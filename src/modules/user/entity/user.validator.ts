import {throwAppError} from "../../errors/errors.global";

export class UserValidator {
    private static moduleName = "UserValidator";
    // -- LENGTH VALIDATIONS --
    private static MaxNameLength = 255;
    private static MaxEmailLength = 255;
    private static MaxPasswordLength = 255;

    private static MinNameLength = 3;
    private static MinEmailLength = 3;
    private static MinPasswordLength = 12;

    // -- SYMBOLS VALIDATIONS --
    private static emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    private static passwordPattern = /^(?=.{12,255}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).*$/;
    private static namePattern = /^[^@]*$/; // DOES NOT CONTAIN '@';


    static validateName(name: string) {
        if (name.length < this.MinNameLength || name.length > this.MaxNameLength) {
            throwAppError(
                `Name must be between ${this.MinNameLength} and ${this.MaxNameLength} characters long.`,
                400,
                `${this.moduleName}.validateName(Length)`
            );
        }
        if (!this.namePattern.test(name)) {
            throwAppError(
                `Name must not contain '@'.`,
                400,
                `${this.moduleName}.validateName(Symbols)`
            )
        }
    }

    static validatePassword(pass: string) {
        if (pass.length < this.MinPasswordLength || pass.length > this.MaxPasswordLength) {
            throwAppError(
                `Password must be between ${this.MinPasswordLength} and ${this.MaxPasswordLength} characters long.`,
                400,
                `${this.moduleName}.validatePassword(Length)`,
            );
        }
        if (!this.passwordPattern.test(pass)) {
            throwAppError(
                `Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.`,
                400,
                `${this.moduleName}.validatePassword(Symbols)`,
            );
        }
    }

    static validateEmail(email: string) {
        if (email.length < this.MinEmailLength || email.length > this.MaxEmailLength) {
            throwAppError(
                `Email must be between ${this.MinEmailLength} and ${this.MaxEmailLength} characters long.`,
                400,
                `${this.moduleName}.validateEmail(Length)`,
            );
        }
        if (!this.emailPattern.test(email)) {
            throwAppError(
                `Email must be a valid email address.`,
                400,
                `${this.moduleName}.validateEmail(Symbols)`,
            );
        }
    }

    static validationPipeline
    (
        name: string,
        email: string,
        password: string
    ) {
        this.validateName(name);
        this.validateEmail(email);
        this.validatePassword(password);
    }
}