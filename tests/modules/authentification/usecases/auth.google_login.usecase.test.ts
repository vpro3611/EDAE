import { AuthGoogleLoginUseCase } from '../../../../src/modules/authentification/usecases/auth.google_login.usecase';
import { UserRepoReaderInterface, UserRepoWriterInterface } from '../../../../src/modules/user/interfaces/interface.repository';
import { ExternalLoginRepoInterface } from '../../../../src/modules/user/interfaces/interface.repository.external_login';
import { UserDtoMapper } from '../../../../src/modules/user/dto/user.dto.mapper';
import { User } from '../../../../src/modules/user/entity/user';
import { AppError } from '../../../../src/modules/errors/errors.global';

// Mock google-auth-library
jest.mock('google-auth-library');

import { OAuth2Client } from 'google-auth-library';

const MockedOAuth2Client = OAuth2Client as jest.MockedClass<typeof OAuth2Client>;

const CLIENT_ID = 'test-client-id';
const CLIENT_SECRET = 'test-client-secret';
const REDIRECT_URI = 'http://localhost:3000/callback';
const GOOGLE_SUB = 'google-sub-123';
const USER_EMAIL = 'test@example.com';
const USER_NAME = 'Test User';
const USER_ID = 'user-uuid-123';

function createMockUser(overrides: Partial<User> = {}): User {
  return new User(
    USER_ID,
    USER_NAME,
    USER_EMAIL,
    'hashed_password',
    new Date('2024-01-01'),
    new Date('2024-01-01'),
    false,
    true,
    'hashed_password',
    null,
    null,
    ...Object.values(overrides) as [],
  );
}

function buildValidUser(overrides: Partial<{
  id: string;
  name: string;
  email: string;
  password_hashed: string;
  is_deleted: boolean;
  is_verified: boolean;
}> = {}): User {
  return new User(
    overrides.id ?? USER_ID,
    overrides.name ?? USER_NAME,
    overrides.email ?? USER_EMAIL,
    overrides.password_hashed ?? 'hashed_password',
    new Date('2024-01-01'),
    new Date('2024-01-01'),
    overrides.is_deleted ?? false,
    overrides.is_verified ?? true,
    'hashed_password',
    null,
    null,
  );
}

function buildMockGoogleClientInstance(payload: Record<string, unknown> | null) {
  return {
    getToken: jest.fn().mockResolvedValue({
      tokens: { id_token: 'mock-id-token' },
    }),
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: jest.fn().mockReturnValue(payload),
    }),
  };
}

function buildUseCase(
  readerOverrides: Partial<UserRepoReaderInterface>,
  writerOverrides: Partial<UserRepoWriterInterface>,
  externalLoginOverrides: Partial<ExternalLoginRepoInterface>,
): AuthGoogleLoginUseCase {
  const reader: UserRepoReaderInterface = {
    getUserById: jest.fn().mockResolvedValue(buildValidUser()),
    getUserByEmail: jest.fn().mockResolvedValue(null),
    getNonDeletedUsers: jest.fn().mockResolvedValue([]),
    getVerifiedUsers: jest.fn().mockResolvedValue([]),
    ...readerOverrides,
  };

  const writer: UserRepoWriterInterface = {
    createUser: jest.fn().mockResolvedValue(undefined),
    updateUser: jest.fn().mockResolvedValue(undefined),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    markUserAsVerified: jest.fn().mockResolvedValue(undefined),
    ...writerOverrides,
  };

  const externalLogin: ExternalLoginRepoInterface = {
    findByProviderAndExternalId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(undefined),
    ...externalLoginOverrides,
  };

  const userDtoMapper = UserDtoMapper.create();

  return AuthGoogleLoginUseCase.create(
    reader,
    writer,
    externalLogin,
    userDtoMapper,
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
  );
}

const VALID_PAYLOAD = {
  sub: GOOGLE_SUB,
  email: USER_EMAIL,
  name: USER_NAME,
};

describe('AuthGoogleLoginUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Test 1: Existing Google login — returns UserDtoForSelf', () => {
    it('should return UserDtoForSelf when external login record already exists', async () => {
      const mockClientInstance = buildMockGoogleClientInstance(VALID_PAYLOAD);
      MockedOAuth2Client.mockImplementation(() => mockClientInstance as unknown as OAuth2Client);

      const mockUser = buildValidUser();

      const useCase = buildUseCase(
        { getUserById: jest.fn().mockResolvedValue(mockUser) },
        {},
        { findByProviderAndExternalId: jest.fn().mockResolvedValue(USER_ID) },
      );

      const result = await useCase.execute('valid-auth-code');

      expect(result).toEqual({
        id: USER_ID,
        name: USER_NAME,
        email: USER_EMAIL,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        is_verified: true,
      });
    });
  });

  describe('Test 2: No Google login but email exists — creates external login, returns user', () => {
    it('should link account and return UserDtoForSelf when user exists by email but no external login', async () => {
      const mockClientInstance = buildMockGoogleClientInstance(VALID_PAYLOAD);
      MockedOAuth2Client.mockImplementation(() => mockClientInstance as unknown as OAuth2Client);

      const mockUser = buildValidUser();
      const mockCreateExternalLogin = jest.fn().mockResolvedValue(undefined);

      const useCase = buildUseCase(
        {
          getUserByEmail: jest.fn().mockResolvedValue(mockUser),
          getUserById: jest.fn().mockResolvedValue(mockUser),
        },
        {},
        {
          findByProviderAndExternalId: jest.fn().mockResolvedValue(null),
          create: mockCreateExternalLogin,
        },
      );

      const result = await useCase.execute('valid-auth-code');

      expect(mockCreateExternalLogin).toHaveBeenCalledWith(USER_ID, 'google', GOOGLE_SUB);
      expect(result.email).toBe(USER_EMAIL);
    });
  });

  describe('Test 3: No Google login and no email — creates user + external login', () => {
    it('should create a new user and external login when neither exists', async () => {
      const mockClientInstance = buildMockGoogleClientInstance(VALID_PAYLOAD);
      MockedOAuth2Client.mockImplementation(() => mockClientInstance as unknown as OAuth2Client);

      const mockUser = buildValidUser();
      const mockCreateUser = jest.fn().mockResolvedValue(undefined);
      const mockMarkVerified = jest.fn().mockResolvedValue(undefined);
      const mockCreateExternalLogin = jest.fn().mockResolvedValue(undefined);

      // getUserByEmail: first call returns null (user not found), second call returns created user
      const mockGetUserByEmail = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);

      const useCase = buildUseCase(
        {
          getUserByEmail: mockGetUserByEmail,
          getUserById: jest.fn().mockResolvedValue(mockUser),
        },
        {
          createUser: mockCreateUser,
          markUserAsVerified: mockMarkVerified,
        },
        {
          findByProviderAndExternalId: jest.fn().mockResolvedValue(null),
          create: mockCreateExternalLogin,
        },
      );

      const result = await useCase.execute('valid-auth-code');

      expect(mockCreateUser).toHaveBeenCalledWith({
        name: USER_NAME,
        email: USER_EMAIL,
        password_hashed: null,
        last_password: null,
      });
      expect(mockMarkVerified).toHaveBeenCalledWith(USER_ID);
      expect(mockCreateExternalLogin).toHaveBeenCalledWith(USER_ID, 'google', GOOGLE_SUB);
      expect(result.email).toBe(USER_EMAIL);
    });

    it('should use email prefix as name when Google name is missing', async () => {
      const payloadWithoutName = { sub: GOOGLE_SUB, email: USER_EMAIL };
      const mockClientInstance = buildMockGoogleClientInstance(payloadWithoutName);
      MockedOAuth2Client.mockImplementation(() => mockClientInstance as unknown as OAuth2Client);

      const mockUser = buildValidUser({ name: 'test' });
      const mockCreateUser = jest.fn().mockResolvedValue(undefined);

      const mockGetUserByEmail = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);

      const useCase = buildUseCase(
        {
          getUserByEmail: mockGetUserByEmail,
          getUserById: jest.fn().mockResolvedValue(mockUser),
        },
        {
          createUser: mockCreateUser,
          markUserAsVerified: jest.fn().mockResolvedValue(undefined),
        },
        { findByProviderAndExternalId: jest.fn().mockResolvedValue(null) },
      );

      await useCase.execute('valid-auth-code');

      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'test' }),
      );
    });
  });

  describe('Test 4: Invalid Google token (no payload) — throws 400 AppError', () => {
    it('should throw 400 AppError when Google token has no payload', async () => {
      const mockClientInstance = buildMockGoogleClientInstance(null);
      MockedOAuth2Client.mockImplementation(() => mockClientInstance as unknown as OAuth2Client);

      const useCase = buildUseCase({}, {}, {});

      await expect(useCase.execute('invalid-auth-code')).rejects.toThrow(AppError);
      await expect(useCase.execute('invalid-auth-code')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid Google token: no payload.',
      });
    });
  });

  describe('Test 5: No email in payload — throws 400 AppError', () => {
    it('should throw 400 AppError when payload has no email', async () => {
      const payloadWithoutEmail = { sub: GOOGLE_SUB, name: USER_NAME };
      const mockClientInstance = buildMockGoogleClientInstance(payloadWithoutEmail);
      MockedOAuth2Client.mockImplementation(() => mockClientInstance as unknown as OAuth2Client);

      const useCase = buildUseCase({}, {}, {});

      await expect(useCase.execute('auth-code-no-email')).rejects.toThrow(AppError);
      await expect(useCase.execute('auth-code-no-email')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid Google token: no email in payload.',
      });
    });
  });
});
