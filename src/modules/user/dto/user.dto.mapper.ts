import {UserDtoForOthers, UserDtoForSelf} from "./user.dto";
import {User} from "../entity/user";


export class UserDtoMapper {

    static create() {
        return new UserDtoMapper();
    }

    mapToUserDto(user: User): UserDtoForSelf {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString(),
            is_verified: user.is_verified,
        }
    }

    mapToUserDtoForOthers(user: User): UserDtoForOthers {
        return {
            id: user.id,
            name: user.name,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString(),
        }
    }
}