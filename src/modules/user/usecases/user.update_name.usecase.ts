import {UserRepoReaderInterface, UserRepoWriterInterface} from "../interfaces/interface.repository";
import {UserValidator} from "../entity/user.validator";
import {throwAppError} from "../../errors/errors.global";


export class UserUpdateNameUseCase {

    private moduleName = "UserUpdateNameUseCase";

    constructor(private readonly userRepoReader: UserRepoReaderInterface,
                private readonly userRepoWriter: UserRepoWriterInterface) {
    }

    static create(userRepoReader: UserRepoReaderInterface, userRepoWriter: UserRepoWriterInterface) {
        return new UserUpdateNameUseCase(userRepoReader, userRepoWriter);
    }

    async execute(id: string, name: string): Promise<void> {
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
    }

}