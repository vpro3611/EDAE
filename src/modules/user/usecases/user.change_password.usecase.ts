import {UserRepoReaderInterface, UserRepoWriterInterface} from "../interfaces/interface.repository";
import {throwAppError} from "../../errors/errors.global";
import {InfraPasswordHasherInterface} from "../../infra/password/infra.password_hasher.interface";
import {UserValidator} from "../entity/user.validator";


export class UserChangePasswordUseCase {

    private moduleName = "UserChangePasswordUseCase";

    constructor(private readonly userRepoReader: UserRepoReaderInterface,
                private readonly userRepoWriter: UserRepoWriterInterface,
                private readonly passwordHasher: InfraPasswordHasherInterface) {
    }

    static create(userRepoReader: UserRepoReaderInterface, userRepoWriter: UserRepoWriterInterface, passwordHasher: InfraPasswordHasherInterface) {
        return new UserChangePasswordUseCase(userRepoReader, userRepoWriter, passwordHasher);
    }

    private ensureNotSamePassword(oldPassword: string, newPassword: string): void {
        if (oldPassword === newPassword) {
            throwAppError(
                "New password must be different from the old password.",
                   400,
                `${this.moduleName}.ensureNotSamePassword()`,
            );
        }
    }

    private validatePassword(password: string) {
        UserValidator.validatePassword(password);
    }

    private async comparePasswords(oldPassword: string, userCurrentPassword: string): Promise<void> {
        const areSame = await this.passwordHasher.compare(oldPassword, userCurrentPassword);
        if (!areSame) {
            throwAppError(
                "Old password is incorrect. It does not match the current password.",
                   400,
                `${this.moduleName}.comparePasswords()`,
            );
        }
    }

    async execute(id: string, oldPassword: string, newPassword: string): Promise<void> {
        this.validatePassword(newPassword);
        this.validatePassword(oldPassword);

        const user = await this.userRepoReader.getUserById(id);

        if (!user) {
            throwAppError(
                "User not found.",
                  404,
                `${this.moduleName}.execute()`,
            );
        }

        this.ensureNotSamePassword(oldPassword, newPassword);

        await this.comparePasswords(oldPassword, user.password_hashed);

        const newPasswordHashed = await this.passwordHasher.hash(newPassword);

        user.updatePassword(newPasswordHashed);
        user.updateLastPassword(newPasswordHashed);

        await this.userRepoWriter.updateUser(user);
    }
}