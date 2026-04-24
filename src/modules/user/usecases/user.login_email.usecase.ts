import {UserRepoReaderInterface, UserRepoWriterInterface} from "../interfaces/interface.repository";
import {UserValidator} from "../entity/user.validator";
import {throwAppError} from "../../errors/errors.global";
import {InfraPasswordHasherInterface} from "../../infra/password/infra.password_hasher.interface";
import {UserDtoMapper} from "../dto/user.dto.mapper";
import {UserDtoForSelf} from "../dto/user.dto";

export class UserLoginEmailUseCase {

    private moduleName = "UserLoginEmailUseCase";

    constructor(private readonly userRepoReader: UserRepoReaderInterface,
                private readonly passwordHasher: InfraPasswordHasherInterface,
                private readonly userDtoMapper: UserDtoMapper) {
    }

    static create(userRepoReader: UserRepoReaderInterface, passwordHasher: InfraPasswordHasherInterface, userDtoMapper: UserDtoMapper) {
        return new UserLoginEmailUseCase(userRepoReader, passwordHasher, userDtoMapper);
    }

    private async comparePasswords(password: string, userCurrentPassword: string): Promise<boolean> {
        return await this.passwordHasher.compare(password, userCurrentPassword);
    }

    async execute(email: string, password: string): Promise<UserDtoForSelf> {
        UserValidator.validateEmail(email);
        UserValidator.validatePassword(password);

        const user = await this.userRepoReader.getUserByEmail(email);
        if (!user) {
            throwAppError(
                "User not found.",
                  404,
                `${this.moduleName}.execute()`,
            )
        }

        user.canLogin();

        const areSame = await this.comparePasswords(password, user.password_hashed);

        if (!areSame) {
            throwAppError(
                "Invalid password.",
                   401,
                `${this.moduleName}.execute()`,
            )
        }

        return this.userDtoMapper.mapToUserDto(user);
    }
}