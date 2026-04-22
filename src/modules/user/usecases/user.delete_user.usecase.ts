import {UserRepoReaderInterface, UserRepoWriterInterface} from "../interfaces/interface.repository";
import {throwAppError} from "../../errors/errors.global";


export class DeleteUserUseCase {

    private moduleName = "DeleteUserUseCase";

    constructor(private readonly userRepoReader: UserRepoReaderInterface,
                private readonly userRepoWriter: UserRepoWriterInterface) {
    }

    static create(userRepoReader: UserRepoReaderInterface, userRepoWriter: UserRepoWriterInterface) {
        return new DeleteUserUseCase(userRepoReader, userRepoWriter);
    }

    async execute(id: string): Promise<void> {
        const user = await this.userRepoReader.getUserById(id);
        if (!user) {
            throwAppError(
                "User not found.",
                  404,
                `${this.moduleName}.execute()`,
            );
        }

        user.assertDelete();

        await this.userRepoWriter.deleteUser(id);
    }
}