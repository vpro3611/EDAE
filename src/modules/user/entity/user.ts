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
    ) {
    }


    static createForDatabase
    (
        name: string,
        email: string,
        password_hashed: string,
    ): {name: string, email: string, password_hashed: string} {

        return {
            name,
            email,
            password_hashed,
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
    ): User {
        UserValidator.validationPipeline(name, email, password_hashed);
        return new User (
            id,
            name,
            email,
            password_hashed,
            created_at,
            updated_at,
            is_deleted,
        )
    }

    checkIfDeleted(): boolean {
        return this.is_deleted;
    }

    updateName(name: string): void {
        UserValidator.validateName(name);
        if (this.checkIfDeleted()) {
            throwAppError(
                "User already deleted.",
                400,
                `${this.moduleName}.updateName()`,
            );
        }
        this.name = name;
    }

    updateEmail(email: string): void {
        UserValidator.validateEmail(email);
        if (this.checkIfDeleted()) {
            throwAppError(
                "User already deleted.",
                400,
                `${this.moduleName}.updateEmail()`,
            );
        }
        this.email = email;
    }

    updatePassword(password_hashed: string): void {
        // we do not validate the password here, because it is already being validated and in here
        // it will arrive as a hash so we can directly update this entity
        if (this.checkIfDeleted()) {
            throwAppError(
                "User already deleted.",
                400,
                `${this.moduleName}.updatePassword()`,
            );
        }
        this.password_hashed = password_hashed;
    }

    delete(): void {
        if (this.checkIfDeleted()) {
            throwAppError(
                "User already deleted.",
                400,
                `${this.moduleName}.delete()`,
            );
        }
        this.is_deleted = true;
    }
}