import {UserRepoReaderInterface} from "../interfaces/interface.repository";
import {throwAppError} from "../../errors/errors.global";
import {UserDtoMapper} from "../dto/user.dto.mapper";
import {UserDtoForSelf} from "../dto/user.dto";


export class UserGetSelfProfileUseCase {

    private moduleName = "UserGetSelfProfileUseCase";

    constructor(private readonly userRepoReader: UserRepoReaderInterface,
                private readonly userDtoMapper: UserDtoMapper) {
    }

    static create(userRepoReader: UserRepoReaderInterface, userDtoMapper: UserDtoMapper) {
        return new UserGetSelfProfileUseCase(userRepoReader, userDtoMapper);
    }

    async getSelfProfile(id: string): Promise<UserDtoForSelf> {
        const user = await this.userRepoReader.getUserById(id);
        if (!user) {
            throwAppError(
                "User not found.",
                 404,
                `${this.moduleName}.getSelfProfile()`,
            )
        }

        user.ensureActiveAndVerified(`${this.moduleName}.getSelfProfile()`);

        return this.userDtoMapper.mapToUserDto(user);
    }
}