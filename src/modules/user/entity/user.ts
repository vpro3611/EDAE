import {UserValidator} from "./user.validator";
import {throwAppError} from "../../errors/errors.global";

export class User {
    private moduleName = "UserDomain";
    constructor
    (
        public id: string,
        public name: string,
        public email: string,
        public password_hashed: string,
        public created_at: Date,
        public updated_at: Date,
        public is_deleted: boolean,
        public is_verified: boolean,
        public last_password: string,
        public pending_password: string | null,
        public pending_email: string | null,
    ) {
    }

    static createForDatabase
    (
        name: string,
        email: string,
        password_hashed: string,
    ): {name: string, email: string, password_hashed: string, last_password: string} {
        return {
            name,
            email,
            password_hashed,
            last_password: password_hashed,
        }
    }

    static restoreUser
    (
        id: string,
        name: string,
        email: string,
        password_hashed: string,
        created_at: Date,
        updated_at: Date,
        is_deleted: boolean,
        is_verified: boolean,
        last_password: string,
        pending_password: string | null,
        pending_email: string | null,
    ): User {
        UserValidator.validateName(name);
        UserValidator.validateEmail(email);
        return new User (
            id,
            name,
            email,
            password_hashed,
            created_at,
            updated_at,
            is_deleted,
            is_verified,
            last_password,
            pending_password,
            pending_email,
        )
    }

     ensureActiveAndVerified(operation: string): void {
        if (this.is_deleted) {
            throwAppError(
                "User already deleted.",
                400,
                `${this.moduleName}.${operation}`,
            );
        }
        if (!this.is_verified) {
            throwAppError(
                "User is not verified.",
                400,
                `${this.moduleName}.${operation}`,
            );
        }
    }

    canLogin() {
        this.ensureActiveAndVerified("canLogin()");
    }

    markAsVerified(): void {
        this.is_verified = true;
    }

    checkIfVerified(): boolean {
        return this.is_verified;
    }

    checkIfDeleted(): boolean {
        return this.is_deleted;
    }

    updateName(name: string): void {
        UserValidator.validateName(name);
        this.ensureActiveAndVerified("updateName()");
        this.name = name;
    }

    updateEmail(email: string): void {
        UserValidator.validateEmail(email);
        this.ensureActiveAndVerified("updateEmail()");
        this.email = email;
    }

    updatePassword(password_hashed: string): void {
        this.ensureActiveAndVerified("updatePassword()");
        this.password_hashed = password_hashed;
    }

    updateLastPassword(last_password: string): void {
        this.ensureActiveAndVerified("updateLastPassword()");
        this.last_password = last_password;
    }

    updatePendingPassword(pending_password: string | null): void {
        this.ensureActiveAndVerified("updatePendingPassword()");
        this.pending_password = pending_password;
    }

    updatePendingEmail(email: string | null): void {
        this.ensureActiveAndVerified("updatePendingEmail()");
        if (email !== null) {
            UserValidator.validateEmail(email);
        }
        this.pending_email = email;
    }

    resetPassword(hash: string): void {
        this.password_hashed = hash;
        this.last_password = hash;
    }

    assertDelete(): void {
        if (this.checkIfDeleted()) {
            throwAppError(
                "User already deleted.",
                400,
                `${this.moduleName}.delete()`,
            );
        }
    }
}
