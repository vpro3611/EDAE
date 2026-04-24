import {UserRepoReaderInterface} from "../interfaces/interface.repository";
import {UserDtoMapper} from "../dto/user.dto.mapper";
import {UserDtoForOthers} from "../dto/user.dto";
import {throwAppError} from "../../errors/errors.global";


export class UserGetOtherProfileUseCase {

    private moduleName = "UserGetOtherProfileUseCase";

    constructor(private readonly userRepoReader: UserRepoReaderInterface,
                private readonly userDtoMapper: UserDtoMapper) {
    }

    static create(userRepoReader: UserRepoReaderInterface, userDtoMapper: UserDtoMapper) {
        return new UserGetOtherProfileUseCase(userRepoReader, userDtoMapper);
    }

    async getOtherUserProfile(actorId: string, targetId: string): Promise<UserDtoForOthers> {

        if (actorId === targetId) {
            throwAppError(
                "You cannot view your own profile in this mode.\nThis is for other's profile viewing.",
                   400,
                `${this.moduleName}.getOtherUserProfile()`,)
        }

        const actor = await this.userRepoReader.getUserById(actorId);
        const target = await this.userRepoReader.getUserById(targetId);

        if (!actor || !target) {
            throwAppError(
                "User not found.",
                  404,
                `${this.moduleName}.getOtherUserProfile()`,
            )
        }

        return this.userDtoMapper.mapToUserDtoForOthers(target);
    }
}