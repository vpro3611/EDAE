import { UserRepoReaderInterface, UserRepoWriterInterface } from '../interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';
import { VerifyOtpUseCase } from '../../token/usecases/token.verify_otp.usecase';
import { TokenPurpose } from '../../token/entity/token';
import {UserDtoMapper} from "../dto/user.dto.mapper";
import {UserDtoForSelf} from "../dto/user.dto";
export class ConfirmEmailChangeUseCase {
    private moduleName = 'ConfirmEmailChangeUseCase';

    constructor(
        private readonly userRepoReader: UserRepoReaderInterface,
        private readonly userRepoWriter: UserRepoWriterInterface,
        private readonly verifyOtpUseCase: VerifyOtpUseCase,
        private readonly userDtoMapper: UserDtoMapper,
    ) {}

    static create(
        userRepoReader: UserRepoReaderInterface,
        userRepoWriter: UserRepoWriterInterface,
        verifyOtpUseCase: VerifyOtpUseCase,
        userDtoMapper: UserDtoMapper,
    ): ConfirmEmailChangeUseCase {
        return new ConfirmEmailChangeUseCase(userRepoReader, userRepoWriter, verifyOtpUseCase, userDtoMapper);
    }

    async execute(userId: string, otp: string): Promise<UserDtoForSelf> {
        const user = await this.userRepoReader.getUserById(userId);
        if (!user) {
            throwAppError('User not found.', 404, `${this.moduleName}.execute()`);
        }
        if (user.pending_email === null) {
            throwAppError('No pending email change.', 400, `${this.moduleName}.execute()`);
        }

        await this.verifyOtpUseCase.execute(userId, TokenPurpose.CHANGE_EMAIL, otp);

        const pendingEmail = user.pending_email;
        user.updateEmail(pendingEmail);
        user.updatePendingEmail(null);
        await this.userRepoWriter.updateUser(user);
        return this.userDtoMapper.mapToUserDto(user);
    }
}
