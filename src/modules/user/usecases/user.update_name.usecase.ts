import {UserRepoReaderInterface, UserRepoWriterInterface} from "../interfaces/interface.repository";
import {UserValidator} from "../entity/user.validator";
import {throwAppError} from "../../errors/errors.global";
import {UserDtoMapper} from "../dto/user.dto.mapper";
import {UserDtoForSelf} from "../dto/user.dto";


export class UserUpdateNameUseCase {

    private moduleName = "UserUpdateNameUseCase";

    constructor(private readonly userRepoReader: UserRepoReaderInterface,
                private readonly userRepoWriter: UserRepoWriterInterface,
                private readonly userDtoMapper: UserDtoMapper) {
    }

    static create(userRepoReader: UserRepoReaderInterface, userRepoWriter: UserRepoWriterInterface, userDtoMapper: UserDtoMapper) {
        return new UserUpdateNameUseCase(userRepoReader, userRepoWriter, userDtoMapper);
    }

    async execute(id: string, name: string): Promise<UserDtoForSelf> {
        const user = await this.userRepoReader.getUserById(id);

        UserValidator.validateName(name);

        if (!user) {
            throwAppError(
                "User not found.",
                 404,
                `${this.moduleName}.execute()`,
            )
        }

        user.updateName(name);

        await this.userRepoWriter.updateUser(user);

        return this.userDtoMapper.mapToUserDto(user);
    }

}