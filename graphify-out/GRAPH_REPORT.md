# Graph Report - .  (2026-05-03)

## Corpus Check
- Large corpus: 368 files · ~165,256 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 517 nodes · 483 edges · 59 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 71 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_HTTP Layer & DI Container|HTTP Layer & DI Container]]
- [[_COMMUNITY_Error & DB Infrastructure|Error & DB Infrastructure]]
- [[_COMMUNITY_Auth Service Operations|Auth Service Operations]]
- [[_COMMUNITY_Middleware & Rate Limiting|Middleware & Rate Limiting]]
- [[_COMMUNITY_User Domain Entity|User Domain Entity]]
- [[_COMMUNITY_User E2E Test Helpers|User E2E Test Helpers]]
- [[_COMMUNITY_JWT Token Management|JWT Token Management]]
- [[_COMMUNITY_Email Infrastructure|Email Infrastructure]]
- [[_COMMUNITY_Connection E2E Test Helpers|Connection E2E Test Helpers]]
- [[_COMMUNITY_Frontend Dashboard|Frontend Dashboard]]
- [[_COMMUNITY_Login Email Use Case|Login Email Use Case]]
- [[_COMMUNITY_AES Crypto Infrastructure|AES Crypto Infrastructure]]
- [[_COMMUNITY_Password Bcrypt Infrastructure|Password Bcrypt Infrastructure]]
- [[_COMMUNITY_Transaction Manager|Transaction Manager]]
- [[_COMMUNITY_User DTO Mapper|User DTO Mapper]]
- [[_COMMUNITY_Get Self Profile Use Case|Get Self Profile Use Case]]
- [[_COMMUNITY_Registration Verification Use Case|Registration Verification Use Case]]
- [[_COMMUNITY_Request Email Change Use Case|Request Email Change Use Case]]
- [[_COMMUNITY_Confirm Registration Use Case|Confirm Registration Use Case]]
- [[_COMMUNITY_Confirm Email Change Use Case|Confirm Email Change Use Case]]
- [[_COMMUNITY_Request Account Deletion Tx|Request Account Deletion Tx]]
- [[_COMMUNITY_Get Other Profile Tx|Get Other Profile Tx]]
- [[_COMMUNITY_Request Email Change Tx|Request Email Change Tx]]
- [[_COMMUNITY_Confirm Account Deletion Tx|Confirm Account Deletion Tx]]
- [[_COMMUNITY_Get Self Profile Tx|Get Self Profile Tx]]
- [[_COMMUNITY_Update Name Tx|Update Name Tx]]
- [[_COMMUNITY_Confirm Email Change Tx|Confirm Email Change Tx]]
- [[_COMMUNITY_Connection Create Use Case|Connection Create Use Case]]
- [[_COMMUNITY_Connection Soft Delete Use Case|Connection Soft Delete Use Case]]
- [[_COMMUNITY_Connection Update Use Case|Connection Update Use Case]]
- [[_COMMUNITY_Connection List Active Use Case|Connection List Active Use Case]]
- [[_COMMUNITY_Connection Restore Use Case|Connection Restore Use Case]]
- [[_COMMUNITY_Connection List Deleted Use Case|Connection List Deleted Use Case]]
- [[_COMMUNITY_Connection Restore Tx|Connection Restore Tx]]
- [[_COMMUNITY_Connection Update Tx|Connection Update Tx]]
- [[_COMMUNITY_Connection Create Tx|Connection Create Tx]]
- [[_COMMUNITY_Connection Soft Delete Tx|Connection Soft Delete Tx]]
- [[_COMMUNITY_Connection List Active Tx|Connection List Active Tx]]
- [[_COMMUNITY_Connection List Deleted Tx|Connection List Deleted Tx]]
- [[_COMMUNITY_Frontend Auth Views|Frontend Auth Views]]
- [[_COMMUNITY_Register Confirm Controller|Register Confirm Controller]]
- [[_COMMUNITY_Logout Controller|Logout Controller]]
- [[_COMMUNITY_Token Refresh Controller|Token Refresh Controller]]
- [[_COMMUNITY_Login Email Controller|Login Email Controller]]
- [[_COMMUNITY_Register Request Controller|Register Request Controller]]
- [[_COMMUNITY_Get Self Profile Controller|Get Self Profile Controller]]
- [[_COMMUNITY_Confirm Account Deletion Controller|Confirm Account Deletion Controller]]
- [[_COMMUNITY_Confirm Email Change Controller|Confirm Email Change Controller]]
- [[_COMMUNITY_Update Name Controller|Update Name Controller]]
- [[_COMMUNITY_Request Account Deletion Controller|Request Account Deletion Controller]]
- [[_COMMUNITY_Get Other Profile Controller|Get Other Profile Controller]]
- [[_COMMUNITY_Request Email Change Controller|Request Email Change Controller]]
- [[_COMMUNITY_Connection DTO Mapper|Connection DTO Mapper]]
- [[_COMMUNITY_Connection List Deleted Controller|Connection List Deleted Controller]]
- [[_COMMUNITY_Connection List Active Controller|Connection List Active Controller]]
- [[_COMMUNITY_Connection Restore Controller|Connection Restore Controller]]
- [[_COMMUNITY_Connection Update Controller|Connection Update Controller]]
- [[_COMMUNITY_Connection Create Controller|Connection Create Controller]]
- [[_COMMUNITY_Connection Soft Delete Controller|Connection Soft Delete Controller]]

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

### Community 0 - "HTTP Layer & DI Container"
Cohesion: 0.05
Nodes (10): UserIdExtractor, Connection, ConnectionValidator, UserValidator, AppError, throwAppError(), ConfirmAccountDeletionUseCase, UserGetOtherProfileUseCase (+2 more)

### Community 1 - "Error & DB Infrastructure"
Cohesion: 0.07
Nodes (7): DatabaseError, throwDatabaseError(), handleDatabaseError(), RepositoryConnectionReader, RepositoryConnectionWriter, RepositoryUserReader, RepositoryUserWriter

### Community 2 - "Auth Service Operations"
Cohesion: 0.13
Nodes (22): confirmPasswordReset(), confirmRegistration(), login(), logout(), register(), requestPasswordReset(), call(), extractError() (+14 more)

### Community 3 - "Middleware & Rate Limiting"
Cohesion: 0.12
Nodes (10): authMiddleware(), errorsMiddleware(), validateBody(), constructLimiterWithPresets(), constructMiddlewareWrapper(), preDefinedPublicLimiters(), createApp(), createDepsContainer() (+2 more)

### Community 4 - "User Domain Entity"
Cohesion: 0.21
Nodes (1): User

### Community 5 - "User E2E Test Helpers"
Cohesion: 0.28
Nodes (11): buildContainer(), mockChangePwService(), mockConfAccDeletionService(), mockConfEmailChangeService(), mockConfPwResetService(), mockGetOtherProfileService(), mockGetSelfProfileService(), mockReqAccDeletionService() (+3 more)

### Community 6 - "JWT Token Management"
Cohesion: 0.2
Nodes (1): AuthentificationService

### Community 7 - "Email Infrastructure"
Cohesion: 0.33
Nodes (1): InfraEmailNodemailerImplementation

### Community 8 - "Connection E2E Test Helpers"
Cohesion: 0.39
Nodes (7): buildContainer(), mockCreateSvc(), mockListActiveSvc(), mockListDeletedSvc(), mockRestoreSvc(), mockSoftDeleteSvc(), mockUpdateSvc()

### Community 9 - "Frontend Dashboard"
Cohesion: 0.29
Nodes (2): handleChangePassword(), resetPasswordForm()

### Community 10 - "Login Email Use Case"
Cohesion: 0.4
Nodes (1): UserLoginEmailUseCase

### Community 11 - "AES Crypto Infrastructure"
Cohesion: 0.33
Nodes (1): InfraCryptoAesImplementation

### Community 12 - "Password Bcrypt Infrastructure"
Cohesion: 0.33
Nodes (1): InfraPasswordBcryptImplementation

### Community 13 - "Transaction Manager"
Cohesion: 0.4
Nodes (1): TransactionManager

### Community 14 - "User DTO Mapper"
Cohesion: 0.4
Nodes (1): UserDtoMapper

### Community 15 - "Get Self Profile Use Case"
Cohesion: 0.4
Nodes (1): UserGetSelfProfileUseCase

### Community 16 - "Registration Verification Use Case"
Cohesion: 0.4
Nodes (1): RequestRegistrationVerificationUseCase

### Community 17 - "Request Email Change Use Case"
Cohesion: 0.4
Nodes (1): RequestEmailChangeUseCase

### Community 18 - "Confirm Registration Use Case"
Cohesion: 0.4
Nodes (1): ConfirmRegistrationUseCase

### Community 19 - "Confirm Email Change Use Case"
Cohesion: 0.4
Nodes (1): ConfirmEmailChangeUseCase

### Community 20 - "Request Account Deletion Tx"
Cohesion: 0.4
Nodes (1): TxServiceRequestAccountDeletion

### Community 21 - "Get Other Profile Tx"
Cohesion: 0.4
Nodes (1): TxServiceGetOtherProfileService

### Community 22 - "Request Email Change Tx"
Cohesion: 0.4
Nodes (1): TxServiceRequestEmailChange

### Community 23 - "Confirm Account Deletion Tx"
Cohesion: 0.4
Nodes (1): TxServiceConfirmAccountDeletion

### Community 24 - "Get Self Profile Tx"
Cohesion: 0.4
Nodes (1): TxServiceGetSelfProfile

### Community 25 - "Update Name Tx"
Cohesion: 0.4
Nodes (1): TxServiceUpdateName

### Community 26 - "Confirm Email Change Tx"
Cohesion: 0.4
Nodes (1): TxServiceConfirmEmailChange

### Community 27 - "Connection Create Use Case"
Cohesion: 0.4
Nodes (1): ConnectionCreateUseCase

### Community 28 - "Connection Soft Delete Use Case"
Cohesion: 0.4
Nodes (1): ConnectionSoftDeleteUseCase

### Community 29 - "Connection Update Use Case"
Cohesion: 0.4
Nodes (1): ConnectionUpdateUseCase

### Community 30 - "Connection List Active Use Case"
Cohesion: 0.4
Nodes (1): ConnectionListActiveUseCase

### Community 31 - "Connection Restore Use Case"
Cohesion: 0.4
Nodes (1): ConnectionRestoreUseCase

### Community 32 - "Connection List Deleted Use Case"
Cohesion: 0.4
Nodes (1): ConnectionListDeletedUseCase

### Community 33 - "Connection Restore Tx"
Cohesion: 0.4
Nodes (1): TxServiceConnectionRestore

### Community 34 - "Connection Update Tx"
Cohesion: 0.4
Nodes (1): TxServiceConnectionUpdate

### Community 35 - "Connection Create Tx"
Cohesion: 0.4
Nodes (1): TxServiceConnectionCreate

### Community 36 - "Connection Soft Delete Tx"
Cohesion: 0.4
Nodes (1): TxServiceConnectionSoftDelete

### Community 37 - "Connection List Active Tx"
Cohesion: 0.4
Nodes (1): TxServiceConnectionListActive

### Community 38 - "Connection List Deleted Tx"
Cohesion: 0.4
Nodes (1): TxServiceConnectionListDeleted

### Community 39 - "Frontend Auth Views"
Cohesion: 0.67
Nodes (2): handleLogin(), validate()

### Community 40 - "Register Confirm Controller"
Cohesion: 0.5
Nodes (1): ControllerRegisterConfirm

### Community 41 - "Logout Controller"
Cohesion: 0.5
Nodes (1): ControllerLogout

### Community 42 - "Token Refresh Controller"
Cohesion: 0.5
Nodes (1): ControllerRefresh

### Community 43 - "Login Email Controller"
Cohesion: 0.5
Nodes (1): ControllerLoginEmail

### Community 44 - "Register Request Controller"
Cohesion: 0.5
Nodes (1): RegisterRequestController

### Community 45 - "Get Self Profile Controller"
Cohesion: 0.5
Nodes (1): ControllerGetSelfProfile

### Community 46 - "Confirm Account Deletion Controller"
Cohesion: 0.5
Nodes (1): ControllerConfirmAccountDeletion

### Community 47 - "Confirm Email Change Controller"
Cohesion: 0.5
Nodes (1): ControllerConfirmEmailChange

### Community 48 - "Update Name Controller"
Cohesion: 0.5
Nodes (1): ControllerUpdateName

### Community 49 - "Request Account Deletion Controller"
Cohesion: 0.5
Nodes (1): ControllerRequestAccountDeletion

### Community 50 - "Get Other Profile Controller"
Cohesion: 0.5
Nodes (1): ControllerGetOtherProfile

### Community 51 - "Request Email Change Controller"
Cohesion: 0.5
Nodes (1): ControllerRequestEmailChange

### Community 52 - "Connection DTO Mapper"
Cohesion: 0.5
Nodes (1): ConnectionDtoMapper

### Community 53 - "Connection List Deleted Controller"
Cohesion: 0.5
Nodes (1): ControllerConnectionListDeleted

### Community 54 - "Connection List Active Controller"
Cohesion: 0.5
Nodes (1): ControllerConnectionListActive

### Community 55 - "Connection Restore Controller"
Cohesion: 0.5
Nodes (1): ControllerConnectionRestore

### Community 56 - "Connection Update Controller"
Cohesion: 0.5
Nodes (1): ControllerConnectionUpdate

### Community 57 - "Connection Create Controller"
Cohesion: 0.5
Nodes (1): ControllerConnectionCreate

### Community 58 - "Connection Soft Delete Controller"
Cohesion: 0.5
Nodes (1): ControllerConnectionSoftDelete

## Knowledge Gaps
- **Thin community `User Domain Entity`** (15 nodes): `User`, `.assertDelete()`, `.canLogin()`, `.checkIfDeleted()`, `.checkIfVerified()`, `.ensureActiveAndVerified()`, `.markAsVerified()`, `.resetPassword()`, `.updateEmail()`, `.updateLastPassword()`, `.updateName()`, `.updatePassword()`, `.updatePendingEmail()`, `.updatePendingPassword()`, `user.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `JWT Token Management`** (12 nodes): `AuthentificationService`, `.assertExistingToken()`, `.constructor()`, `.create()`, `.generateTokens()`, `.hashToken()`, `.loginEmail()`, `.logout()`, `.refresh()`, `.registerConfirm()`, `.registerRequest()`, `auth_service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Email Infrastructure`** (9 nodes): `InfraEmailNodemailerImplementation`, `.constructor()`, `.create()`, `.send()`, `.sendAccountDeletionOtp()`, `.sendEmailChangeOtp()`, `.sendPasswordResetOtp()`, `.sendRegistrationOtp()`, `infra.email_nodemailer.implementation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Dashboard`** (8 nodes): `DashboardView.vue`, `handleChangePassword()`, `handleConfirmDeletion()`, `handleConfirmEmailChange()`, `handleRequestDeletion()`, `handleRequestEmailChange()`, `openEditName()`, `resetPasswordForm()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Email Use Case`** (6 nodes): `user.login_email.usecase.ts`, `UserLoginEmailUseCase`, `.comparePasswords()`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AES Crypto Infrastructure`** (6 nodes): `InfraCryptoAesImplementation`, `.constructor()`, `.create()`, `.decrypt()`, `.encrypt()`, `infra.encryption_aes.implementation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Password Bcrypt Infrastructure`** (6 nodes): `InfraPasswordBcryptImplementation`, `.compare()`, `.constructor()`, `.create()`, `.hash()`, `infra.pasword_bcrypt.implementation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Transaction Manager`** (6 nodes): `transaction_manager.implementation.ts`, `TransactionManager`, `.assertError()`, `.constructor()`, `.create()`, `.runInTransaction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `User DTO Mapper`** (5 nodes): `UserDtoMapper`, `.create()`, `.mapToUserDto()`, `.mapToUserDtoForOthers()`, `user.dto.mapper.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Get Self Profile Use Case`** (5 nodes): `user.get_self_profile.usecase.ts`, `UserGetSelfProfileUseCase`, `.constructor()`, `.create()`, `.getSelfProfile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Registration Verification Use Case`** (5 nodes): `user.request_registration_verification.usecase.ts`, `RequestRegistrationVerificationUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Request Email Change Use Case`** (5 nodes): `user.request_email_change.usecase.ts`, `RequestEmailChangeUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Confirm Registration Use Case`** (5 nodes): `user.confirm_registration.usecase.ts`, `ConfirmRegistrationUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Confirm Email Change Use Case`** (5 nodes): `user.confirm_email_change.usecase.ts`, `ConfirmEmailChangeUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Request Account Deletion Tx`** (5 nodes): `tx_service.request_account_deletion.ts`, `TxServiceRequestAccountDeletion`, `.constructor()`, `.create()`, `.requestAccountDeletionService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Get Other Profile Tx`** (5 nodes): `tx_service.get_other_profile.ts`, `TxServiceGetOtherProfileService`, `.constructor()`, `.create()`, `.getOtherProfileService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Request Email Change Tx`** (5 nodes): `tx_service.request_email_change.ts`, `TxServiceRequestEmailChange`, `.constructor()`, `.create()`, `.requestEmailChangeService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Confirm Account Deletion Tx`** (5 nodes): `tx_service.confirm_account_deletion.ts`, `TxServiceConfirmAccountDeletion`, `.confirmAccountDeletionService()`, `.constructor()`, `.create()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Get Self Profile Tx`** (5 nodes): `tx_service.get_self_profile.ts`, `TxServiceGetSelfProfile`, `.constructor()`, `.create()`, `.getSelfProfileService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Update Name Tx`** (5 nodes): `tx_service.update_name.ts`, `TxServiceUpdateName`, `.constructor()`, `.create()`, `.updateNameService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Confirm Email Change Tx`** (5 nodes): `tx_service.confirm_email_change.ts`, `TxServiceConfirmEmailChange`, `.confirmEmailChangeService()`, `.constructor()`, `.create()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Create Use Case`** (5 nodes): `connection.create.usecase.ts`, `ConnectionCreateUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Soft Delete Use Case`** (5 nodes): `connection.soft_delete.usecase.ts`, `ConnectionSoftDeleteUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Update Use Case`** (5 nodes): `connection.update.usecase.ts`, `ConnectionUpdateUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection List Active Use Case`** (5 nodes): `connection.list_active.usecase.ts`, `ConnectionListActiveUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Restore Use Case`** (5 nodes): `connection.restore.usecase.ts`, `ConnectionRestoreUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection List Deleted Use Case`** (5 nodes): `connection.list_deleted.usecase.ts`, `ConnectionListDeletedUseCase`, `.constructor()`, `.create()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Restore Tx`** (5 nodes): `tx_service.connection.restore.ts`, `TxServiceConnectionRestore`, `.constructor()`, `.create()`, `.restoreConnectionService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Update Tx`** (5 nodes): `tx_service.connection.update.ts`, `TxServiceConnectionUpdate`, `.constructor()`, `.create()`, `.updateConnectionService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Create Tx`** (5 nodes): `tx_service.connection.create.ts`, `TxServiceConnectionCreate`, `.constructor()`, `.create()`, `.createConnectionService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Soft Delete Tx`** (5 nodes): `tx_service.connection.soft_delete.ts`, `TxServiceConnectionSoftDelete`, `.constructor()`, `.create()`, `.softDeleteConnectionService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection List Active Tx`** (5 nodes): `tx_service.connection.list_active.ts`, `TxServiceConnectionListActive`, `.constructor()`, `.create()`, `.listActiveConnectionsService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection List Deleted Tx`** (5 nodes): `tx_service.connection.list_deleted.ts`, `TxServiceConnectionListDeleted`, `.constructor()`, `.create()`, `.listDeletedConnectionsService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Auth Views`** (4 nodes): `AuthLayout.vue`, `LoginView.vue`, `handleLogin()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Register Confirm Controller`** (4 nodes): `ControllerRegisterConfirm`, `.constructor()`, `.create()`, `controller.register_confirm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Logout Controller`** (4 nodes): `ControllerLogout`, `.constructor()`, `.create()`, `controller.logout.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Token Refresh Controller`** (4 nodes): `ControllerRefresh`, `.constructor()`, `.create()`, `controller.refresh.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Email Controller`** (4 nodes): `ControllerLoginEmail`, `.constructor()`, `.create()`, `controller.login_email.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Register Request Controller`** (4 nodes): `RegisterRequestController`, `.constructor()`, `.create()`, `controller.register_request.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Get Self Profile Controller`** (4 nodes): `ControllerGetSelfProfile`, `.constructor()`, `.create()`, `controller.get_self_profile.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Confirm Account Deletion Controller`** (4 nodes): `ControllerConfirmAccountDeletion`, `.constructor()`, `.create()`, `controller.confirm_account_deletion.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Confirm Email Change Controller`** (4 nodes): `ControllerConfirmEmailChange`, `.constructor()`, `.create()`, `controller.confirm_email_change.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Update Name Controller`** (4 nodes): `ControllerUpdateName`, `.constructor()`, `.create()`, `controller.update_name.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Request Account Deletion Controller`** (4 nodes): `ControllerRequestAccountDeletion`, `.constructor()`, `.create()`, `controller.request_account_deletion.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Get Other Profile Controller`** (4 nodes): `ControllerGetOtherProfile`, `.constructor()`, `.create()`, `controller.get_other_profile.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Request Email Change Controller`** (4 nodes): `ControllerRequestEmailChange`, `.constructor()`, `.create()`, `controller.request_email_change.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection DTO Mapper`** (4 nodes): `ConnectionDtoMapper`, `.create()`, `.mapToDto()`, `connection.dto.mapper.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection List Deleted Controller`** (4 nodes): `ControllerConnectionListDeleted`, `.constructor()`, `.create()`, `controller.connection.list_deleted.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection List Active Controller`** (4 nodes): `ControllerConnectionListActive`, `.constructor()`, `.create()`, `controller.connection.list_active.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Restore Controller`** (4 nodes): `ControllerConnectionRestore`, `.constructor()`, `.create()`, `controller.connection.restore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Update Controller`** (4 nodes): `ControllerConnectionUpdate`, `.constructor()`, `.create()`, `controller.connection.update.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Create Controller`** (4 nodes): `ControllerConnectionCreate`, `.constructor()`, `.create()`, `controller.connection.create.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Soft Delete Controller`** (4 nodes): `ControllerConnectionSoftDelete`, `.constructor()`, `.create()`, `controller.connection.soft_delete.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `throwAppError()` connect `HTTP Layer & DI Container` to `User Domain Entity`, `JWT Token Management`, `Login Email Use Case`, `Transaction Manager`, `Get Self Profile Use Case`, `Registration Verification Use Case`, `Request Email Change Use Case`, `Confirm Registration Use Case`, `Confirm Email Change Use Case`, `Connection Soft Delete Use Case`, `Connection Update Use Case`, `Connection Restore Use Case`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `throwAppError()` (e.g. with `.assertExistingToken()` and `.extractUserId()`) actually correct?**
  _`throwAppError()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `call()` (e.g. with `getSelfProfile()` and `getOtherProfile()`) actually correct?**
  _`call()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `handleDatabaseError()` (e.g. with `.createUser()` and `.updateUser()`) actually correct?**
  _`handleDatabaseError()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Should `HTTP Layer & DI Container` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Error & DB Infrastructure` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Auth Service Operations` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._