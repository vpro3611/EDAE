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
import {RegisterRequestController} from "./modules/authentification/controllers/controller.register_request";
import {ControllerRegisterConfirm} from "./modules/authentification/controllers/controller.register_confirm";
import {ControllerRefresh} from "./modules/authentification/controllers/controller.refresh";
import {ControllerLogout} from "./modules/authentification/controllers/controller.logout";
import {ControllerLoginEmail} from "./modules/authentification/controllers/controller.login_email";
import {ControllerGoogleLogin} from "./modules/authentification/controllers/controller.google_login";
import {ControllerChangePassword} from "./modules/user/controllers/controller.change_password";
import {UserIdExtractor} from "./modules/authentification/extractor.extract_user_id";
import {ControllerConfirmAccountDeletion} from "./modules/user/controllers/controller.confirm_account_deletion";
import {ControllerConfirmEmailChange} from "./modules/user/controllers/controller.confirm_email_change";
import {ControllerConfirmPasswordReset} from "./modules/user/controllers/controller.confirm_password_reset";
import {ControllerRequestAccountDeletion} from "./modules/user/controllers/controller.request_account_deletion";
import {ControllerRequestEmailChange} from "./modules/user/controllers/controller.request_email_change";
import {ControllerRequestPasswordReset} from "./modules/user/controllers/controller.request_password_reset";
import {ControllerUpdateName} from "./modules/user/controllers/controller.update_name";
import {UserGetSelfProfileUseCase} from "./modules/user/usecases/user.get_self_profile.usecase";
import {UserGetOtherProfileUseCase} from "./modules/user/usecases/user.get_other_profile.usecase";
import {TxServiceGetSelfProfile} from "./modules/user/transactional_services/tx_service.get_self_profile";
import {TxServiceGetOtherProfileService} from "./modules/user/transactional_services/tx_service.get_other_profile";
import {ControllerGetSelfProfile} from "./modules/user/controllers/controller.get_self_profile";
import {ControllerGetOtherProfile} from "./modules/user/controllers/controller.get_other_profile";
import { InfraCryptoAesImplementation } from './modules/infra/encryption/infra.encryption_aes.implementation';
import { ConnectionDtoMapper } from './modules/connection/dto/connection.dto.mapper';
import { TxServiceConnectionCreate } from './modules/connection/transactional_services/tx_service.connection.create';
import { TxServiceConnectionListActive } from './modules/connection/transactional_services/tx_service.connection.list_active';
import { TxServiceConnectionListDeleted } from './modules/connection/transactional_services/tx_service.connection.list_deleted';
import { TxServiceConnectionUpdate } from './modules/connection/transactional_services/tx_service.connection.update';
import { TxServiceConnectionSoftDelete } from './modules/connection/transactional_services/tx_service.connection.soft_delete';
import { TxServiceConnectionRestore } from './modules/connection/transactional_services/tx_service.connection.restore';
import { ControllerConnectionCreate } from './modules/connection/controllers/controller.connection.create';
import { ControllerConnectionListActive } from './modules/connection/controllers/controller.connection.list_active';
import { ControllerConnectionListDeleted } from './modules/connection/controllers/controller.connection.list_deleted';
import { ControllerConnectionUpdate } from './modules/connection/controllers/controller.connection.update';
import { ControllerConnectionSoftDelete } from './modules/connection/controllers/controller.connection.soft_delete';
import { ControllerConnectionRestore } from './modules/connection/controllers/controller.connection.restore';
import { GithubSourceDtoMapper } from './modules/github_source/dto/github_source.dto.mapper';
import { TxServiceGithubSourceCreate } from './modules/github_source/transactional_services/tx_service.github_source.create';
import { TxServiceGithubSourceList } from './modules/github_source/transactional_services/tx_service.github_source.list';
import { TxServiceGithubSourceDelete } from './modules/github_source/transactional_services/tx_service.github_source.delete';
import { ControllerGithubSourceCreate } from './modules/github_source/controllers/controller.github_source.create';
import { ControllerGithubSourceList } from './modules/github_source/controllers/controller.github_source.list';
import { ControllerGithubSourceDelete } from './modules/github_source/controllers/controller.github_source.delete';
import { SubscriptionDtoMapper } from './modules/subscription/dto/subscription.dto.mapper';
import { TxServiceSubscriptionCreate } from './modules/subscription/transactional_services/tx_service.subscription.create';
import { TxServiceSubscriptionList } from './modules/subscription/transactional_services/tx_service.subscription.list';
import { TxServiceSubscriptionDelete } from './modules/subscription/transactional_services/tx_service.subscription.delete';
import { ControllerSubscriptionCreate } from './modules/subscription/controllers/controller.subscription.create';
import { ControllerSubscriptionList } from './modules/subscription/controllers/controller.subscription.list';
import { ControllerSubscriptionDelete } from './modules/subscription/controllers/controller.subscription.delete';
import { ReportConfigDtoMapper } from './modules/report/dto/report_config.dto.mapper';
import { TxServiceReportConfigCreate } from './modules/report/transactional_services/tx_service.report_config.create';
import { TxServiceReportConfigList } from './modules/report/transactional_services/tx_service.report_config.list';
import { TxServiceReportConfigDelete } from './modules/report/transactional_services/tx_service.report_config.delete';
import { RepositoryReportConfigReader } from './modules/report/repository/repository.report_config.reader';
import { RepositoryReportConfigWriter } from './modules/report/repository/repository.report_config.writer';
import { RepositoryGithubSourceReader } from './modules/github_source/repository/repository.github_source.reader';
import { RepositoryConnectionReader } from './modules/connection/repository/repository.connection.reader';
import { FetchGithubActivityUseCase } from './modules/report/usecases/fetch_github_activity.usecase';
import { PdfService } from './modules/report/pdf/pdf.service';
import { NotificationDispatcher } from './modules/notification/notification.dispatcher';
import { GenerateReportService } from './modules/report/generate_report.service';
import { ControllerReportConfigCreate } from './modules/report/controllers/controller.report_config.create';
import { ControllerReportConfigList } from './modules/report/controllers/controller.report_config.list';
import { ControllerReportConfigDelete } from './modules/report/controllers/controller.report_config.delete';
import { ControllerReportGenerate } from './modules/report/controllers/controller.report.generate';

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

    const userIdExtractor = UserIdExtractor.create();

    const userDtoMapper = UserDtoMapper.create();
    const txManager = TransactionManager.create(pool);
    const jwtTokenService = JwtTokenService.create();

    const encryption = InfraCryptoAesImplementation.create(process.env.ENCRYPTION_KEY!);
    const connectionDtoMapper = ConnectionDtoMapper.create();

    const txConnectionCreate = TxServiceConnectionCreate.create(txManager, encryption, connectionDtoMapper);
    const txConnectionListActive = TxServiceConnectionListActive.create(txManager, encryption, connectionDtoMapper);
    const txConnectionListDeleted = TxServiceConnectionListDeleted.create(txManager, encryption, connectionDtoMapper);
    const txConnectionUpdate = TxServiceConnectionUpdate.create(txManager, encryption, connectionDtoMapper);
    const txConnectionSoftDelete = TxServiceConnectionSoftDelete.create(txManager, encryption);
    const txConnectionRestore = TxServiceConnectionRestore.create(txManager, encryption, connectionDtoMapper);

    const controllerConnectionCreate = ControllerConnectionCreate.create(txConnectionCreate, userIdExtractor);
    const controllerConnectionListActive = ControllerConnectionListActive.create(txConnectionListActive, userIdExtractor);
    const controllerConnectionListDeleted = ControllerConnectionListDeleted.create(txConnectionListDeleted, userIdExtractor);
    const controllerConnectionUpdate = ControllerConnectionUpdate.create(txConnectionUpdate, userIdExtractor);
    const controllerConnectionSoftDelete = ControllerConnectionSoftDelete.create(txConnectionSoftDelete, userIdExtractor);
    const controllerConnectionRestore = ControllerConnectionRestore.create(txConnectionRestore, userIdExtractor);

    const githubSourceDtoMapper = GithubSourceDtoMapper.create();
    const txGithubSourceCreate = TxServiceGithubSourceCreate.create(txManager, encryption, githubSourceDtoMapper);
    const txGithubSourceList = TxServiceGithubSourceList.create(txManager, encryption, githubSourceDtoMapper);
    const txGithubSourceDelete = TxServiceGithubSourceDelete.create(txManager, encryption);
    const controllerGithubSourceCreate = ControllerGithubSourceCreate.create(txGithubSourceCreate, userIdExtractor);
    const controllerGithubSourceList = ControllerGithubSourceList.create(txGithubSourceList, userIdExtractor);
    const controllerGithubSourceDelete = ControllerGithubSourceDelete.create(txGithubSourceDelete, userIdExtractor);

    const subscriptionDtoMapper = SubscriptionDtoMapper.create();
    const txSubscriptionCreate = TxServiceSubscriptionCreate.create(txManager, encryption, subscriptionDtoMapper);
    const txSubscriptionList = TxServiceSubscriptionList.create(txManager, encryption, subscriptionDtoMapper);
    const txSubscriptionDelete = TxServiceSubscriptionDelete.create(txManager, encryption);
    const controllerSubscriptionCreate = ControllerSubscriptionCreate.create(txSubscriptionCreate, userIdExtractor);
    const controllerSubscriptionList = ControllerSubscriptionList.create(txSubscriptionList, userIdExtractor);
    const controllerSubscriptionDelete = ControllerSubscriptionDelete.create(txSubscriptionDelete, userIdExtractor);

    // report module
    const reportConfigDtoMapper = ReportConfigDtoMapper.create();
    const txReportConfigCreate = TxServiceReportConfigCreate.create(txManager, encryption, reportConfigDtoMapper);
    const txReportConfigList = TxServiceReportConfigList.create(txManager, reportConfigDtoMapper);
    const txReportConfigDelete = TxServiceReportConfigDelete.create(txManager);

    const reportConfigReader = RepositoryReportConfigReader.create(pool);
    const reportConfigWriter = RepositoryReportConfigWriter.create(pool);
    const githubSourceReader = RepositoryGithubSourceReader.create(pool, encryption);
    const connectionReaderDirect = RepositoryConnectionReader.create(pool, encryption);
    const fetchActivityUseCase = FetchGithubActivityUseCase.create(githubSourceReader);
    const pdfService = PdfService.create();
    const notificationDispatcher = NotificationDispatcher.create(emailSender);
    const generateReportService = GenerateReportService.create(
        reportConfigReader, reportConfigWriter, connectionReaderDirect,
        fetchActivityUseCase, pdfService, notificationDispatcher,
    );

    const controllerReportConfigCreate = ControllerReportConfigCreate.create(txReportConfigCreate, userIdExtractor);
    const controllerReportConfigList = ControllerReportConfigList.create(txReportConfigList, userIdExtractor);
    const controllerReportConfigDelete = ControllerReportConfigDelete.create(txReportConfigDelete, userIdExtractor);
    const controllerReportGenerate = ControllerReportGenerate.create(generateReportService, userIdExtractor);

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

    const getSelfProfileUseCase = UserGetSelfProfileUseCase.create(userRepoReader, userDtoMapper);
    const getOtherProfileUseCase = UserGetOtherProfileUseCase.create(userRepoReader, userDtoMapper);

    const authentificationService = AuthentificationService.create(jwtTokenService, txManager, bcryptHasher, emailSender, userDtoMapper);

    const txChangePassword = TxServiceChangePassword.create(txManager, bcryptHasher);
    const txUpdateName = TxServiceUpdateName.create(txManager, userDtoMapper);
    const txRequestEmailChange = TxServiceRequestEmailChange.create(txManager, emailSender);
    const txConfirmEmailChange = TxServiceConfirmEmailChange.create(txManager, userDtoMapper);
    const txRequestPasswordReset = TxServiceRequestPasswordReset.create(txManager, emailSender);
    const txConfirmPasswordReset = TxServiceConfirmPasswordReset.create(txManager, bcryptHasher);
    const txRequestAccountDeletion = TxServiceRequestAccountDeletion.create(txManager, emailSender);
    const txConfirmAccountDeletion = TxServiceConfirmAccountDeletion.create(txManager);
    const txGetSelfProfile = TxServiceGetSelfProfile.create(txManager, userDtoMapper);
    const txGetOtherProfile = TxServiceGetOtherProfileService.create(txManager, userDtoMapper);

    const controllerRegisterRequest = RegisterRequestController.create(authentificationService);
    const controllerRegisterConfirm = ControllerRegisterConfirm.create(authentificationService);
    const controllerRefresh = ControllerRefresh.create(authentificationService);
    const controllerLogout = ControllerLogout.create(authentificationService);
    const controllerLoginEmail = ControllerLoginEmail.create(authentificationService);
    const controllerGoogleLogin = ControllerGoogleLogin.create(authentificationService);

    const controllerChangePassword = ControllerChangePassword.create(txChangePassword, userIdExtractor);
    const controllerConfirmAccountDeletion = ControllerConfirmAccountDeletion.create(txConfirmAccountDeletion, userIdExtractor);
    const controllerConfirmEmailChange = ControllerConfirmEmailChange.create(txConfirmEmailChange, userIdExtractor);
    const controllerConfirmPasswordReset = ControllerConfirmPasswordReset.create(txConfirmPasswordReset);
    const controllerRequestAccountDeletion = ControllerRequestAccountDeletion.create(txRequestAccountDeletion, userIdExtractor);
    const controllerRequestEmailChange = ControllerRequestEmailChange.create(txRequestEmailChange, userIdExtractor);
    const controllerRequestPasswordReset = ControllerRequestPasswordReset.create(txRequestPasswordReset);
    const controllerUpdateName = ControllerUpdateName.create(txUpdateName, userIdExtractor);
    const controllerGetSelfProfile = ControllerGetSelfProfile.create(txGetSelfProfile, userIdExtractor);
    const controllerGetOtherProfile = ControllerGetOtherProfile.create(txGetOtherProfile, userIdExtractor);


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

        // actual controllers
        controllerRegisterRequest,
        controllerRegisterConfirm,
        controllerRefresh,
        controllerLogout,
        controllerLoginEmail,
        controllerGoogleLogin,

        controllerChangePassword,
        controllerConfirmAccountDeletion,
        controllerConfirmEmailChange,
        controllerConfirmPasswordReset,
        controllerRequestAccountDeletion,
        controllerRequestEmailChange,
        controllerRequestPasswordReset,
        controllerUpdateName,

        controllerGetSelfProfile,
        controllerGetOtherProfile,

        controllerConnectionCreate,
        controllerConnectionListActive,
        controllerConnectionListDeleted,
        controllerConnectionUpdate,
        controllerConnectionSoftDelete,
        controllerConnectionRestore,

        controllerGithubSourceCreate,
        controllerGithubSourceList,
        controllerGithubSourceDelete,

        controllerSubscriptionCreate,
        controllerSubscriptionList,
        controllerSubscriptionDelete,

        controllerReportConfigCreate,
        controllerReportConfigList,
        controllerReportConfigDelete,
        controllerReportGenerate,

        emailSender,
        encryption,
    };
}

export type DepsContainer = ReturnType<typeof createDepsContainer>;