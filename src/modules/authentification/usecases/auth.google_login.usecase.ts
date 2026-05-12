import { OAuth2Client } from 'google-auth-library';
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../user/interfaces/interface.repository';
import { ExternalLoginRepoInterface } from '../../user/interfaces/interface.repository.external_login';
import { UserDtoMapper } from '../../user/dto/user.dto.mapper';
import { UserDtoForSelf } from '../../user/dto/user.dto';
import { throwAppError } from '../../errors/errors.global';

export class AuthGoogleLoginUseCase {
  private readonly moduleName = 'AuthGoogleLoginUseCase';

  constructor(
    private readonly userRepoReader: UserRepoReaderInterface,
    private readonly userRepoWriter: UserRepoWriterInterface,
    private readonly externalLoginRepo: ExternalLoginRepoInterface,
    private readonly userDtoMapper: UserDtoMapper,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  static create(
    userRepoReader: UserRepoReaderInterface,
    userRepoWriter: UserRepoWriterInterface,
    externalLoginRepo: ExternalLoginRepoInterface,
    userDtoMapper: UserDtoMapper,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): AuthGoogleLoginUseCase {
    return new AuthGoogleLoginUseCase(
      userRepoReader,
      userRepoWriter,
      externalLoginRepo,
      userDtoMapper,
      clientId,
      clientSecret,
      redirectUri,
    );
  }

  async execute(code: string): Promise<UserDtoForSelf> {
    const client = new OAuth2Client(this.clientId, this.clientSecret, this.redirectUri);

    const tokenResponse = await client.getToken(code);
    const idToken = tokenResponse.tokens.id_token;

    const ticket = await client.verifyIdToken({
      idToken: idToken!,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throwAppError(
        'Invalid Google token: no payload.',
        400,
        `${this.moduleName}.execute()`,
      );
    }

    const { sub: googleId, email, name } = payload;

    if (!email) {
      throwAppError(
        'Invalid Google token: no email in payload.',
        400,
        `${this.moduleName}.execute()`,
      );
    }

    // Step 1: Check if external login already exists
    let userId = await this.externalLoginRepo.findByProviderAndExternalId('google', googleId!);

    if (!userId) {
      // Step 2: Check if user exists by email
      let existingUser = await this.userRepoReader.getUserByEmail(email);

      if (!existingUser) {
        // Step 3a: Create a new user
        const newName = name || email.split('@')[0];
        await this.userRepoWriter.createUser({
          name: newName,
          email,
          password_hashed: null,
          last_password: null,
        });

        existingUser = await this.userRepoReader.getUserByEmail(email);
        if (!existingUser) {
          throwAppError(
            'Failed to create user.',
            500,
            `${this.moduleName}.execute()`,
          );
        }

        // Mark as verified since they authenticated via Google
        await this.userRepoWriter.markUserAsVerified(existingUser.id);
      }

      // Step 3b: Create external login record
      await this.externalLoginRepo.create(existingUser.id, 'google', googleId!);
      userId = existingUser.id;
    }

    // Step 4: Fetch final user, guard, and return DTO
    const user = await this.userRepoReader.getUserById(userId);
    if (!user) {
      throwAppError(
        'User not found.',
        404,
        `${this.moduleName}.execute()`,
      );
    }

    user.canLogin();

    return this.userDtoMapper.mapToUserDto(user);
  }
}
