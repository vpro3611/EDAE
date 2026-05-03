# Graph Report - .  (2026-05-03)

## Corpus Check
- Large corpus: 368 files · ~164,964 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 561 nodes · 542 edges · 61 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 71 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth & User Orchestration|Auth & User Orchestration]]
- [[_COMMUNITY_Error Handling|Error Handling]]
- [[_COMMUNITY_Frontend API Layer|Frontend API Layer]]
- [[_COMMUNITY_HTTP Middlewares|HTTP Middlewares]]
- [[_COMMUNITY_User Entity & Domain|User Entity & Domain]]
- [[_COMMUNITY_Coverage Report JS|Coverage Report JS]]
- [[_COMMUNITY_User E2E Tests|User E2E Tests]]
- [[_COMMUNITY_Auth Service|Auth Service]]
- [[_COMMUNITY_Coverage Report Prettify|Coverage Report Prettify]]
- [[_COMMUNITY_Email Infrastructure|Email Infrastructure]]
- [[_COMMUNITY_Connection E2E Tests|Connection E2E Tests]]
- [[_COMMUNITY_Frontend Dashboard|Frontend Dashboard]]
- [[_COMMUNITY_Login Use Case|Login Use Case]]
- [[_COMMUNITY_AES Encryption|AES Encryption]]
- [[_COMMUNITY_bcrypt Password|bcrypt Password]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]

## God Nodes (most connected - your core abstractions)
1. `throwAppError()` - 28 edges
2. `call()` - 22 edges
3. `handleDatabaseError()` - 17 edges
4. `User` - 14 edges
5. `AuthentificationService` - 11 edges
6. `buildContainer()` - 11 edges
7. `Connection` - 10 edges
8. `RepositoryConnectionWriter` - 9 edges
9. `RepositoryUserReader` - 8 edges
10. `InfraEmailNodemailerImplementation` - 8 edges

## Surprising Connections (you probably didn't know these)
- `getSelfProfile()` --calls--> `call()`  [INFERRED]
  frontend/src/api/user.ts → frontend/src/api/client.ts
- `getOtherProfile()` --calls--> `call()`  [INFERRED]
  frontend/src/api/user.ts → frontend/src/api/client.ts
- `updateName()` --calls--> `call()`  [INFERRED]
  frontend/src/api/user.ts → frontend/src/api/client.ts
- `changePassword()` --calls--> `call()`  [INFERRED]
  frontend/src/api/user.ts → frontend/src/api/client.ts
- `requestEmailChange()` --calls--> `call()`  [INFERRED]
  frontend/src/api/user.ts → frontend/src/api/client.ts

## Communities

### Community 0 - "Auth & User Orchestration"
Cohesion: 0.04
Nodes (11): UserIdExtractor, Connection, ConnectionValidator, UserValidator, AppError, throwAppError(), ConnectionSoftDeleteUseCase, ConnectionUpdateUseCase (+3 more)

### Community 1 - "Error Handling"
Cohesion: 0.07
Nodes (7): DatabaseError, throwDatabaseError(), handleDatabaseError(), RepositoryConnectionReader, RepositoryConnectionWriter, RepositoryUserReader, RepositoryUserWriter

### Community 2 - "Frontend API Layer"
Cohesion: 0.13
Nodes (22): confirmPasswordReset(), confirmRegistration(), login(), logout(), register(), requestPasswordReset(), call(), extractError() (+14 more)

### Community 3 - "HTTP Middlewares"
Cohesion: 0.12
Nodes (10): authMiddleware(), errorsMiddleware(), validateBody(), constructLimiterWithPresets(), constructMiddlewareWrapper(), preDefinedPublicLimiters(), createApp(), createDepsContainer() (+2 more)

### Community 4 - "User Entity & Domain"
Cohesion: 0.21
Nodes (1): User

### Community 5 - "Coverage Report JS"
Cohesion: 0.27
Nodes (11): addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns(), loadData() (+3 more)

### Community 6 - "User E2E Tests"
Cohesion: 0.28
Nodes (11): buildContainer(), mockChangePwService(), mockConfAccDeletionService(), mockConfEmailChangeService(), mockConfPwResetService(), mockGetOtherProfileService(), mockGetSelfProfileService(), mockReqAccDeletionService() (+3 more)

### Community 7 - "Auth Service"
Cohesion: 0.2
Nodes (1): AuthentificationService

### Community 8 - "Coverage Report Prettify"
Cohesion: 0.35
Nodes (8): a(), B(), D(), g(), i(), k(), Q(), y()

### Community 9 - "Email Infrastructure"
Cohesion: 0.33
Nodes (1): InfraEmailNodemailerImplementation

### Community 10 - "Connection E2E Tests"
Cohesion: 0.39
Nodes (7): buildContainer(), mockCreateSvc(), mockListActiveSvc(), mockListDeletedSvc(), mockRestoreSvc(), mockSoftDeleteSvc(), mockUpdateSvc()

### Community 11 - "Frontend Dashboard"
Cohesion: 0.29
Nodes (2): handleChangePassword(), resetPasswordForm()

### Community 12 - "Login Use Case"
Cohesion: 0.4
Nodes (1): UserLoginEmailUseCase

### Community 13 - "AES Encryption"
Cohesion: 0.33
Nodes (1): InfraCryptoAesImplementation

### Community 14 - "bcrypt Password"
Cohesion: 0.33
Nodes (1): InfraPasswordBcryptImplementation

### Community 15 - "Community 15"
Cohesion: 0.4
Nodes (1): TransactionManager

### Community 16 - "Community 16"
Cohesion: 0.4
Nodes (1): UserDtoMapper

### Community 17 - "Community 17"
Cohesion: 0.4
Nodes (1): UserGetSelfProfileUseCase

### Community 18 - "Community 18"
Cohesion: 0.4
Nodes (1): RequestRegistrationVerificationUseCase

### Community 19 - "Community 19"
Cohesion: 0.4
Nodes (1): RequestAccountDeletionUseCase

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (1): RequestEmailChangeUseCase

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (1): ConfirmAccountDeletionUseCase

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (1): ConfirmRegistrationUseCase

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (1): TxServiceRequestAccountDeletion

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (1): TxServiceGetOtherProfileService

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (1): TxServiceRequestEmailChange

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (1): TxServiceConfirmAccountDeletion

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (1): TxServiceGetSelfProfile

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (1): TxServiceUpdateName

### Community 29 - "Community 29"
Cohesion: 0.4
Nodes (1): TxServiceConfirmEmailChange

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (1): ConnectionCreateUseCase

### Community 31 - "Community 31"
Cohesion: 0.4
Nodes (1): ConnectionListActiveUseCase

### Community 32 - "Community 32"
Cohesion: 0.4
Nodes (1): ConnectionRestoreUseCase

### Community 33 - "Community 33"
Cohesion: 0.4
Nodes (1): ConnectionListDeletedUseCase

### Community 34 - "Community 34"
Cohesion: 0.4
Nodes (1): TxServiceConnectionRestore

### Community 35 - "Community 35"
Cohesion: 0.4
Nodes (1): TxServiceConnectionUpdate

### Community 36 - "Community 36"
Cohesion: 0.4
Nodes (1): TxServiceConnectionCreate

### Community 37 - "Community 37"
Cohesion: 0.4
Nodes (1): TxServiceConnectionSoftDelete

### Community 38 - "Community 38"
Cohesion: 0.4
Nodes (1): TxServiceConnectionListActive

### Community 39 - "Community 39"
Cohesion: 0.4
Nodes (1): TxServiceConnectionListDeleted

### Community 40 - "Community 40"
Cohesion: 0.7
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (2): handleLogin(), validate()

### Community 42 - "Community 42"
Cohesion: 0.5
Nodes (1): ControllerRegisterConfirm

### Community 43 - "Community 43"
Cohesion: 0.5
Nodes (1): ControllerLogout

### Community 44 - "Community 44"
Cohesion: 0.5
Nodes (1): ControllerRefresh

### Community 45 - "Community 45"
Cohesion: 0.5
Nodes (1): ControllerLoginEmail

### Community 46 - "Community 46"
Cohesion: 0.5
Nodes (1): RegisterRequestController

### Community 47 - "Community 47"
Cohesion: 0.5
Nodes (1): ControllerGetSelfProfile

### Community 48 - "Community 48"
Cohesion: 0.5
Nodes (1): ControllerConfirmAccountDeletion

### Community 49 - "Community 49"
Cohesion: 0.5
Nodes (1): ControllerConfirmEmailChange

### Community 50 - "Community 50"
Cohesion: 0.5
Nodes (1): ControllerUpdateName

### Community 51 - "Community 51"
Cohesion: 0.5
Nodes (1): ControllerRequestAccountDeletion

### Community 52 - "Community 52"
Cohesion: 0.5
Nodes (1): ControllerGetOtherProfile

### Community 53 - "Community 53"
Cohesion: 0.5
Nodes (1): ControllerRequestEmailChange

### Community 54 - "Community 54"
Cohesion: 0.5
Nodes (1): ConnectionDtoMapper

### Community 55 - "Community 55"
Cohesion: 0.5
Nodes (1): ControllerConnectionListDeleted

### Community 56 - "Community 56"
Cohesion: 0.5
Nodes (1): ControllerConnectionListActive

### Community 57 - "Community 57"
Cohesion: 0.5
Nodes (1): ControllerConnectionRestore

### Community 58 - "Community 58"
Cohesion: 0.5
Nodes (1): ControllerConnectionUpdate

### Community 59 - "Community 59"
Cohesion: 0.5
Nodes (1): ControllerConnectionCreate

### Community 60 - "Community 60"
Cohesion: 0.5
Nodes (1): ControllerConnectionSoftDelete

## Knowledge Gaps
- **Thin community `User Entity & Domain`** (15 nodes): `User`, `.assertDelete()`, `.canLogin()`, `.checkIfDeleted()`, `.checkIfVerified()`, `.ensureActiveAndVerified()`, `.markAsVerified()`, `.resetPassword()`, `.updateEmail()`, `.updateLastPassword()`, `.updateName()`, `.updatePassword()`, `.updatePendingEmail()`, `.updatePendingPassword()`, `user.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Service`** (12 nodes): `AuthentificationService`, `.assertExistingToken()`, `.constructor()`, `.create()`, `.generateTokens()`, `.hashToken()`, `.loginEmail()`, `.logout()`, `.refresh()`, `.registerConfirm()`, `.registerRequest()`, `auth_service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Email Infrastructure`** (9 nodes): `InfraEmailNodemailerImplementation`, `.constructor()`, `.create()`, `.send()`, `.sendAccountDeletionOtp()`, `.sendEmailChangeOtp()`, `.sendPasswordResetOtp()`, `.sendRegistrationOtp()`, `infra.email_nodemailer.implementation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Dashboard`** (8 nodes): `DashboardView.vue`, `handleChangePassword()`, `handleConfirmDeletion()`, `handleConfirmEmailChange()`, `handleRequestDeletion()`, `handleRequestEmailChange()`, `openEditName()`, `resetPasswordForm()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Use Case`** (6 nodes): `user.login_email.usecase.ts`, `UserLoginEmailUseCase`, `.comparePasswords()`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AES Encryption`** (6 nodes): `InfraCryptoAesImplementation`, `.constructor()`, `.create()`, `.decrypt()`, `.encrypt()`, `infra.encryption_aes.implementation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `bcrypt Password`** (6 nodes): `InfraPasswordBcryptImplementation`, `.compare()`, `.constructor()`, `.create()`, `.hash()`, `infra.pasword_bcrypt.implementation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (6 nodes): `transaction_manager.implementation.ts`, `TransactionManager`, `.assertError()`, `.constructor()`, `.create()`, `.runInTransaction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (5 nodes): `UserDtoMapper`, `.create()`, `.mapToUserDto()`, `.mapToUserDtoForOthers()`, `user.dto.mapper.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (5 nodes): `user.get_self_profile.usecase.ts`, `UserGetSelfProfileUseCase`, `.constructor()`, `.create()`, `.getSelfProfile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (5 nodes): `user.request_registration_verification.usecase.ts`, `RequestRegistrationVerificationUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (5 nodes): `user.request_account_deletion.usecase.ts`, `RequestAccountDeletionUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (5 nodes): `user.request_email_change.usecase.ts`, `RequestEmailChangeUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (5 nodes): `user.confirm_account_deletion.usecase.ts`, `ConfirmAccountDeletionUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (5 nodes): `user.confirm_registration.usecase.ts`, `ConfirmRegistrationUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (5 nodes): `tx_service.request_account_deletion.ts`, `TxServiceRequestAccountDeletion`, `.constructor()`, `.create()`, `.requestAccountDeletionService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (5 nodes): `tx_service.get_other_profile.ts`, `TxServiceGetOtherProfileService`, `.constructor()`, `.create()`, `.getOtherProfileService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (5 nodes): `tx_service.request_email_change.ts`, `TxServiceRequestEmailChange`, `.constructor()`, `.create()`, `.requestEmailChangeService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (5 nodes): `tx_service.confirm_account_deletion.ts`, `TxServiceConfirmAccountDeletion`, `.confirmAccountDeletionService()`, `.constructor()`, `.create()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (5 nodes): `tx_service.get_self_profile.ts`, `TxServiceGetSelfProfile`, `.constructor()`, `.create()`, `.getSelfProfileService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (5 nodes): `tx_service.update_name.ts`, `TxServiceUpdateName`, `.constructor()`, `.create()`, `.updateNameService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (5 nodes): `tx_service.confirm_email_change.ts`, `TxServiceConfirmEmailChange`, `.confirmEmailChangeService()`, `.constructor()`, `.create()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (5 nodes): `connection.create.usecase.ts`, `ConnectionCreateUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (5 nodes): `connection.list_active.usecase.ts`, `ConnectionListActiveUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (5 nodes): `connection.restore.usecase.ts`, `ConnectionRestoreUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (5 nodes): `connection.list_deleted.usecase.ts`, `ConnectionListDeletedUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (5 nodes): `tx_service.connection.restore.ts`, `TxServiceConnectionRestore`, `.constructor()`, `.create()`, `.restoreConnectionService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (5 nodes): `tx_service.connection.update.ts`, `TxServiceConnectionUpdate`, `.constructor()`, `.create()`, `.updateConnectionService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (5 nodes): `tx_service.connection.create.ts`, `TxServiceConnectionCreate`, `.constructor()`, `.create()`, `.createConnectionService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (5 nodes): `tx_service.connection.soft_delete.ts`, `TxServiceConnectionSoftDelete`, `.constructor()`, `.create()`, `.softDeleteConnectionService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (5 nodes): `tx_service.connection.list_active.ts`, `TxServiceConnectionListActive`, `.constructor()`, `.create()`, `.listActiveConnectionsService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (5 nodes): `tx_service.connection.list_deleted.ts`, `TxServiceConnectionListDeleted`, `.constructor()`, `.create()`, `.listDeletedConnectionsService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (4 nodes): `AuthLayout.vue`, `LoginView.vue`, `handleLogin()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (4 nodes): `ControllerRegisterConfirm`, `.constructor()`, `.create()`, `controller.register_confirm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (4 nodes): `ControllerLogout`, `.constructor()`, `.create()`, `controller.logout.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (4 nodes): `ControllerRefresh`, `.constructor()`, `.create()`, `controller.refresh.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (4 nodes): `ControllerLoginEmail`, `.constructor()`, `.create()`, `controller.login_email.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (4 nodes): `RegisterRequestController`, `.constructor()`, `.create()`, `controller.register_request.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (4 nodes): `ControllerGetSelfProfile`, `.constructor()`, `.create()`, `controller.get_self_profile.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (4 nodes): `ControllerConfirmAccountDeletion`, `.constructor()`, `.create()`, `controller.confirm_account_deletion.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (4 nodes): `ControllerConfirmEmailChange`, `.constructor()`, `.create()`, `controller.confirm_email_change.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (4 nodes): `ControllerUpdateName`, `.constructor()`, `.create()`, `controller.update_name.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (4 nodes): `ControllerRequestAccountDeletion`, `.constructor()`, `.create()`, `controller.request_account_deletion.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (4 nodes): `ControllerGetOtherProfile`, `.constructor()`, `.create()`, `controller.get_other_profile.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (4 nodes): `ControllerRequestEmailChange`, `.constructor()`, `.create()`, `controller.request_email_change.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (4 nodes): `ConnectionDtoMapper`, `.create()`, `.mapToDto()`, `connection.dto.mapper.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (4 nodes): `ControllerConnectionListDeleted`, `.constructor()`, `.create()`, `controller.connection.list_deleted.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (4 nodes): `ControllerConnectionListActive`, `.constructor()`, `.create()`, `controller.connection.list_active.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (4 nodes): `ControllerConnectionRestore`, `.constructor()`, `.create()`, `controller.connection.restore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (4 nodes): `ControllerConnectionUpdate`, `.constructor()`, `.create()`, `controller.connection.update.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (4 nodes): `ControllerConnectionCreate`, `.constructor()`, `.create()`, `controller.connection.create.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (4 nodes): `ControllerConnectionSoftDelete`, `.constructor()`, `.create()`, `controller.connection.soft_delete.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `throwAppError()` connect `Auth & User Orchestration` to `Community 32`, `User Entity & Domain`, `Auth Service`, `Login Use Case`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `throwAppError()` (e.g. with `.assertExistingToken()` and `.extractUserId()`) actually correct?**
  _`throwAppError()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `call()` (e.g. with `getSelfProfile()` and `getOtherProfile()`) actually correct?**
  _`call()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `handleDatabaseError()` (e.g. with `.createUser()` and `.updateUser()`) actually correct?**
  _`handleDatabaseError()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Should `Auth & User Orchestration` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Error Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Frontend API Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._