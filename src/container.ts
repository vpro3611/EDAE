import { pool } from "./database";
import { RepositoryUserReader } from "./modules/user/repository/repository.user.reader";
import { RepositoryUserWriter } from "./modules/user/repository/repository.user.writer";
import { RepositoryTokenReader } from "./modules/token/repository/repository.token.reader";
import { RepositoryTokenWriter } from "./modules/token/repository/repository.token.writer";
import { InfraPasswordBcryptImplementation } from "./modules/infra/password/infra.pasword_bcrypt.implementation";
import { InfraEmailNodemailerImplementation } from "./modules/infra/email/infra.email_nodemailer.implementation";
import { CreateOtpUseCase } from "./modules/token/usecases/token.create_otp.usecase";
import { VerifyOtpUseCase } from "./modules/token/usecases/token.verify_otp.usecase";
import { UserChangePasswordUseCase } from "./modules/user/usecases/user.change_password.usecase";
import { UserUpdateNameUseCase } from "./modules/user/usecases/user.update_name.usecase";
import { RequestRegistrationVerificationUseCase } from "./modules/user/usecases/user.request_registration_verification.usecase";
import { ConfirmRegistrationUseCase } from "./modules/user/usecases/user.confirm_registration.usecase";
import { RequestPasswordResetUseCase } from "./modules/user/usecases/user.request_password_reset.usecase";
import { ConfirmPasswordResetUseCase } from "./modules/user/usecases/user.confirm_password_reset.usecase";
import { RequestEmailChangeUseCase } from "./modules/user/usecases/user.request_email_change.usecase";
import { ConfirmEmailChangeUseCase } from "./modules/user/usecases/user.confirm_email_change.usecase";
import { RequestAccountDeletionUseCase } from "./modules/user/usecases/user.request_account_deletion.usecase";
import { ConfirmAccountDeletionUseCase } from "./modules/user/usecases/user.confirm_account_deletion.usecase";
import { UserDtoMapper } from "./modules/user/dto/user.dto.mapper";
import { TransactionManager } from "./modules/infra/transaction_manager/transaction_manager.implementation";
import { JwtTokenService } from "./modules/authentification/jwt/service/jwt.token_service";
import { AuthentificationService } from "./modules/authentification/auth_service";
import { TxServiceChangePassword } from "./modules/user/transactional_services/tx_service.change_password";
import { TxServiceUpdateName } from "./modules/user/transactional_services/tx_service.update_name";
import { TxServiceRequestEmailChange } from "./modules/user/transactional_services/tx_service.request_email_change";
import { TxServiceConfirmEmailChange } from "./modules/user/transactional_services/tx_service.confirm_email_change";
import { TxServiceRequestPasswordReset } from "./modules/user/transactional_services/tx_service.request_password_reset";
import { TxServiceConfirmPasswordReset } from "./modules/user/transactional_services/tx_service.confirm_password_reset";
import { TxServiceRequestAccountDeletion } from "./modules/user/transactional_services/tx_service.request_account_deletion";
import { TxServiceConfirmAccountDeletion } from "./modules/user/transactional_services/tx_service.confirm_account_deletion";

export function createDepsContainer() {
    const userRepoReader = RepositoryUserReader.create(pool);
    const userRepoWriter = RepositoryUserWriter.create(pool);
    const tokenRepoReader = RepositoryTokenReader.create(pool);
    const tokenRepoWriter = RepositoryTokenWriter.create(pool);

    const bcryptHasher = InfraPasswordBcryptImplementation.create(12);

    const emailSender = InfraEmailNodemailerImplementation.create(
        process.env.SMTP_HOST!,
        Number(process.env.SMTP_PORT!),
        process.env.SMTP_USER!,
        process.env.SMTP_PASS!,
    );

    const userDtoMapper = UserDtoMapper.create();
    const txManager = TransactionManager.create(pool);
    const jwtTokenService = JwtTokenService.create();

    const createOtpUseCase = CreateOtpUseCase.create(tokenRepoWriter, emailSender);
    const verifyOtpUseCase = VerifyOtpUseCase.create(tokenRepoReader, tokenRepoWriter);

    const userChangePasswordUseCase = UserChangePasswordUseCase.create(userRepoReader, userRepoWriter, bcryptHasher);
    const userUpdateNameUseCase = UserUpdateNameUseCase.create(userRepoReader, userRepoWriter, userDtoMapper);

    const requestRegistrationVerificationUseCase = RequestRegistrationVerificationUseCase.create(userRepoReader, userRepoWriter, bcryptHasher, createOtpUseCase);
    const confirmRegistrationUseCase = ConfirmRegistrationUseCase.create(userRepoReader, userRepoWriter, verifyOtpUseCase, userDtoMapper);

    const requestPasswordResetUseCase = RequestPasswordResetUseCase.create(userRepoReader, createOtpUseCase);
    const confirmPasswordResetUseCase = ConfirmPasswordResetUseCase.create(userRepoReader, userRepoWriter, bcryptHasher, verifyOtpUseCase);

    const requestEmailChangeUseCase = RequestEmailChangeUseCase.create(userRepoReader, userRepoWriter, createOtpUseCase);
    const confirmEmailChangeUseCase = ConfirmEmailChangeUseCase.create(userRepoReader, userRepoWriter, verifyOtpUseCase, userDtoMapper);

    const requestAccountDeletionUseCase = RequestAccountDeletionUseCase.create(userRepoReader, createOtpUseCase);
    const confirmAccountDeletionUseCase = ConfirmAccountDeletionUseCase.create(userRepoReader, userRepoWriter, verifyOtpUseCase);

    const authentificationService = AuthentificationService.create(jwtTokenService, txManager, bcryptHasher, emailSender, userDtoMapper);

    const txChangePassword = TxServiceChangePassword.create(txManager, bcryptHasher);
    const txUpdateName = TxServiceUpdateName.create(txManager, userDtoMapper);
    const txRequestEmailChange = TxServiceRequestEmailChange.create(txManager, emailSender);
    const txConfirmEmailChange = TxServiceConfirmEmailChange.create(txManager, userDtoMapper);
    const txRequestPasswordReset = TxServiceRequestPasswordReset.create(txManager, emailSender);
    const txConfirmPasswordReset = TxServiceConfirmPasswordReset.create(txManager, bcryptHasher);
    const txRequestAccountDeletion = TxServiceRequestAccountDeletion.create(txManager, emailSender);
    const txConfirmAccountDeletion = TxServiceConfirmAccountDeletion.create(txManager);

    return {
        jwtTokenService,
        userChangePasswordUseCase,
        userUpdateNameUseCase,
        requestRegistrationVerificationUseCase,
        confirmRegistrationUseCase,
        requestPasswordResetUseCase,
        confirmPasswordResetUseCase,
        requestEmailChangeUseCase,
        confirmEmailChangeUseCase,
        requestAccountDeletionUseCase,
        confirmAccountDeletionUseCase,
        authentificationService,
        txChangePassword,
        txUpdateName,
        txRequestEmailChange,
        txConfirmEmailChange,
        txRequestPasswordReset,
        txConfirmPasswordReset,
        txRequestAccountDeletion,
        txConfirmAccountDeletion,
    };
}

export type DepsContainer = ReturnType<typeof createDepsContainer>;