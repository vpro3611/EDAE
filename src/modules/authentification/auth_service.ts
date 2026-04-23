import crypto from 'crypto';
import {JwtRefreshTokenRepositoryInterface} from "./jwt/interfaces/jwt.refresh_token.repository.interface";
import {JwtTokenServiceInterface} from "./jwt/interfaces/jwt.token_service.interface";
import {TransactionManagerInterface} from "../infra/transaction_manager/transaction_manager.interface";
import {InfraPasswordHasherInterface} from "../infra/password/infra.password_hasher.interface";
import {REFRESH_TOKEN_EXPIRATION_TIME_FOR_DATABASE} from "./jwt/jwt.config";
import {JwtRefreshTokenRepository} from "./jwt/repository/jwt.refresh_token.repository";
import {RepositoryUserReader} from "../user/repository/repository.user.reader";
import {throwAppError} from "../errors/errors.global";
import {JwtTokenDto} from "./jwt/dto/jwt.token.dto";
import {InfraEmailSenderInterface} from "../infra/email/infra.email_sender.interface";
import {CreateOtpUseCase} from "../token/usecases/token.create_otp.usecase";
import {RepositoryTokenWriter} from "../token/repository/repository.token.writer";
import {RequestRegistrationVerificationUseCase} from "../user/usecases/user.request_registration_verification.usecase";
import {RepositoryUserWriter} from "../user/repository/repository.user.writer";
import {UserDtoMapper} from "../user/dto/user.dto.mapper";
import {ConfirmRegistrationUseCase} from "../user/usecases/user.confirm_registration.usecase";
import {VerifyOtpUseCase} from "../token/usecases/token.verify_otp.usecase";
import {RepositoryTokenReader} from "../token/repository/repository.token.reader";
import {UserDtoForSelf} from "../user/dto/user.dto";
import {UserLoginEmailUseCase} from "../user/usecases/user.login_email.usecase";


export class AuthentificationService {

    private moduleName = "AuthentificationService";

    constructor(
                private readonly jwtTokenService: JwtTokenServiceInterface,
                private readonly txManager: TransactionManagerInterface,
                private readonly hasher: InfraPasswordHasherInterface,
                private readonly emailSender: InfraEmailSenderInterface,
                private readonly userDtoMapper: UserDtoMapper) {
    }

    static create(
        jwtTokenService: JwtTokenServiceInterface,
        txManager: TransactionManagerInterface,
        hasher: InfraPasswordHasherInterface,
        emailSender: InfraEmailSenderInterface,
        userDtoMapper: UserDtoMapper
    ) {
        return new AuthentificationService(jwtTokenService, txManager, hasher, emailSender, userDtoMapper);
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    private async generateTokens(userId: string, repo: JwtRefreshTokenRepositoryInterface): Promise<{accessToken: string, refreshToken: string}> {
        const accessToken = this.jwtTokenService.generateAccessToken(userId);
        const refreshToken = this.jwtTokenService.generateRefreshToken(userId);

        const hashedRefreshToken = this.hashToken(refreshToken);

        await repo.create(
            {
                userId,
                tokenHash: hashedRefreshToken,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_TIME_FOR_DATABASE)
            }
        );

        return {accessToken, refreshToken};
    }

    private assertExistingToken(existingToken: JwtTokenDto | null): JwtTokenDto {
        if (!existingToken) {
            throwAppError(
                "Invalid refresh token.",
                401,
                `${this.moduleName}.assertExistingToken()`,
            );
        }

        if (existingToken.expiresAt < new Date()) {
            throwAppError(
                "Refresh token has expired.",
                401,
                `${this.moduleName}.assertExistingToken()`,
            );
        }
        return existingToken;
    }

    async refresh(refreshToken: string): Promise<{user: UserDtoForSelf, accessToken: string, refreshToken: string}> {
        return await this.txManager.runInTransaction(async (client) => {
            const refreshRepo = JwtRefreshTokenRepository.create(client);
            const userRepoReader = RepositoryUserReader.create(client);

            const payload = this.jwtTokenService.verifyRefreshToken(refreshToken);

            const userDtoMapper = this.userDtoMapper;

            const hashed = this.hashToken(refreshToken);

            const existingToken = await refreshRepo.findValidByHash(hashed);

            const asserted = this.assertExistingToken(existingToken);

            const user = await userRepoReader.getUserById(payload.sub);
            if (!user) {
                throwAppError(
                    "User not found.",
                    404,
                    `${this.moduleName}.refresh()`,
                );
            }

            user.canLogin();

            await refreshRepo.revokeById(asserted.id);

            const mappedUser = userDtoMapper.mapToUserDto(user);

            const tokens = await this.generateTokens(user.id, refreshRepo);
            return {user: mappedUser, ...tokens};
        })
    }

    // REGISTRATION (REQ + CONF)
    async registerRequest(name: string, email: string, password: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoReader = RepositoryUserReader.create(client);
            const userRepoWriter = RepositoryUserWriter.create(client);
            const hasher = this.hasher;
            const emailSender = this.emailSender;
            const otpTokenRepoWriter = RepositoryTokenWriter.create(client);
            const createOtpUseCase = CreateOtpUseCase.create(otpTokenRepoWriter, emailSender);

            const registerRequestUseCase = RequestRegistrationVerificationUseCase.create(
                userRepoReader,
                userRepoWriter,
                hasher,
                createOtpUseCase,
            );

            return await registerRequestUseCase.execute(name, email, password);
        })
    }

    async registerConfirm(email: string, otp: string): Promise<{ user: UserDtoForSelf, accessToken: string, refreshToken: string }> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoReader = RepositoryUserReader.create(client);
            const userRepoWriter = RepositoryUserWriter.create(client);
            const otpTokenRepoWriter = RepositoryTokenWriter.create(client);
            const otpTokenRepoReader = RepositoryTokenReader.create(client);
            const jwtRefreshTokenRepo = JwtRefreshTokenRepository.create(client);

            const verifyOtpUseCase = VerifyOtpUseCase.create(otpTokenRepoReader, otpTokenRepoWriter);
            const userDtoMapper = this.userDtoMapper;


            const registerConfirmUseCase = ConfirmRegistrationUseCase.create(
                userRepoReader,
                userRepoWriter,
                verifyOtpUseCase,
                userDtoMapper
            );

            const user = await registerConfirmUseCase.execute(email, otp);

            const tokens = await this.generateTokens(user.id, jwtRefreshTokenRepo);

            return {user, ...tokens};
        })
    }

    // LOGIN (EMAIL + PASS)
    async loginEmail(email: string, password: string): Promise<{refreshToken: string, accessToken: string, loggedUser: UserDtoForSelf}> {
        return await this.txManager.runInTransaction(async (client) => {
            const userRepoReader = RepositoryUserReader.create(client);
            const userDtoMapper = this.userDtoMapper;
            const hasher = this.hasher;

            const refreshTokenRepo = JwtRefreshTokenRepository.create(client);

            const loginEmailUseCase = UserLoginEmailUseCase.create(
                userRepoReader,
                hasher,
                userDtoMapper
            );


            const loggedUser = await loginEmailUseCase.execute(email, password);
            const tokens = await this.generateTokens(loggedUser.id, refreshTokenRepo);

            return {loggedUser, ...tokens};
        })
    }

    async logout(refreshToken: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const refreshTokenRepo = JwtRefreshTokenRepository.create(client);
            const hashed = this.hashToken(refreshToken);

            await refreshTokenRepo.revokeByHash(hashed);
        });
    }

}