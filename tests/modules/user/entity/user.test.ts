import { User } from "../../../../src/modules/user/entity/user";
import { AppError } from "../../../../src/modules/errors/errors.global";

describe("User Entity Unit Tests", () => {
  const validUserProps = {
    id: "uuid-1",
    name: "John Doe",
    email: "john@example.com",
    password_hashed: "HashedPass123!",
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false,
    is_verified: true,
    last_password: "HashedPass123!",
    pending_password: null as string | null,
    pending_email: null as string | null,
  };

  const createValidUser = (overrides = {}) => {
    const props = { ...validUserProps, ...overrides };
    return User.restoreUser(
      props.id,
      props.name,
      props.email,
      props.password_hashed,
      props.created_at,
      props.updated_at,
      props.is_deleted,
      props.is_verified,
      props.last_password,
      props.pending_password,
      props.pending_email
    );
  };

  describe("createForDatabase", () => {
    it("should return correct name/email/password/last_password object", () => {
      const result = User.createForDatabase(
        validUserProps.name,
        validUserProps.email,
        validUserProps.password_hashed
      );

      expect(result).toEqual({
        name: validUserProps.name,
        email: validUserProps.email,
        password_hashed: validUserProps.password_hashed,
        last_password: validUserProps.password_hashed,
      });
    });
  });

  describe("restoreUser", () => {
    it("should create an instance and validate name/email but NOT password complexity for hash", () => {
      // Even if hash doesn't meet complexity (e.g. "short"), it should pass in restoreUser
      const user = createValidUser({ password_hashed: "short" });

      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe(validUserProps.id);
      expect(user.password_hashed).toBe("short");
    });

    it("should throw AppError if name validation fails", () => {
      expect(() => {
        createValidUser({ name: "J" }); // Too short
      }).toThrow(AppError);
    });

    it("should throw AppError if email validation fails", () => {
      expect(() => {
        createValidUser({ email: "invalid-email" });
      }).toThrow(AppError);
    });
  });

  describe("checkIfDeleted and checkIfVerified", () => {
    it("should return correct status for active verified user", () => {
      const user = createValidUser();
      expect(user.checkIfDeleted()).toBe(false);
      expect(user.checkIfVerified()).toBe(true);
    });

    it("should return correct status for deleted user", () => {
      const user = createValidUser({ is_deleted: true });
      expect(user.checkIfDeleted()).toBe(true);
    });

    it("should return correct status for unverified user", () => {
      const user = createValidUser({ is_verified: false });
      expect(user.checkIfVerified()).toBe(false);
    });
  });

  describe("Update operations", () => {
    it("should update name when active and verified", () => {
      const user = createValidUser();
      const newName = "Jane Doe";
      user.updateName(newName);
      expect(user.name).toBe(newName);
    });

    it("should update email when active and verified", () => {
      const user = createValidUser();
      const newEmail = "jane@example.com";
      user.updateEmail(newEmail);
      expect(user.email).toBe(newEmail);
    });

    it("should update password when active and verified", () => {
      const user = createValidUser();
      const newPassword = "NewHashedPass123!";
      user.updatePassword(newPassword);
      expect(user.password_hashed).toBe(newPassword);
    });

    it("should update last password when active and verified", () => {
      const user = createValidUser();
      const newLast = "LastHashedPass123!";
      user.updateLastPassword(newLast);
      expect(user.last_password).toBe(newLast);
    });

    it("should update pending password when active and verified", () => {
      const user = createValidUser();
      const pending = "PendingHashed123!";
      user.updatePendingPassword(pending);
      expect(user.pending_password).toBe(pending);
      
      user.updatePendingPassword(null);
      expect(user.pending_password).toBe(null);
    });
  });

  describe("ensureActiveAndVerified guards", () => {
    it("should throw error if user is deleted", () => {
      const user = createValidUser({ is_deleted: true });
      expect(() => user.updateName("New Name")).toThrow(/User already deleted/);
      expect(() => user.updateEmail("new@email.com")).toThrow(/User already deleted/);
      expect(() => user.updatePassword("pass")).toThrow(/User already deleted/);
      expect(() => user.updateLastPassword("pass")).toThrow(/User already deleted/);
      expect(() => user.updatePendingPassword("pass")).toThrow(/User already deleted/);
    });

    it("should throw error if user is not verified", () => {
      const user = createValidUser({ is_verified: false });
      expect(() => user.updateName("New Name")).toThrow(/User is not verified/);
      expect(() => user.updateEmail("new@email.com")).toThrow(/User is not verified/);
      expect(() => user.updatePassword("pass")).toThrow(/User is not verified/);
      expect(() => user.updateLastPassword("pass")).toThrow(/User is not verified/);
      expect(() => user.updatePendingPassword("pass")).toThrow(/User is not verified/);
    });
  });

  describe("assertDelete", () => {
    it("should NOT throw if user is NOT deleted", () => {
      const user = createValidUser();
      expect(() => user.assertDelete()).not.toThrow();
    });

    it("should throw if user is already deleted", () => {
      const user = createValidUser({ is_deleted: true });
      expect(() => user.assertDelete()).toThrow(/User already deleted/);
    });
  });

  describe('updatePendingEmail()', () => {
    it('should set pending_email to a valid email', () => {
      const user = createValidUser();
      user.updatePendingEmail('new@example.com');
      expect(user.pending_email).toBe('new@example.com');
    });

    it('should set pending_email to null', () => {
      const user = createValidUser({ pending_email: 'old@example.com' });
      user.updatePendingEmail(null);
      expect(user.pending_email).toBeNull();
    });

    it('should throw AppError for invalid email format', () => {
      const user = createValidUser();
      expect(() => user.updatePendingEmail('not-an-email')).toThrow(AppError);
    });

    it('should throw AppError if user is deleted', () => {
      const user = createValidUser({ is_deleted: true });
      expect(() => user.updatePendingEmail('new@example.com')).toThrow(/already deleted/);
    });

    it('should throw AppError if user is not verified', () => {
      const user = createValidUser({ is_verified: false });
      expect(() => user.updatePendingEmail('new@example.com')).toThrow(/not verified/);
    });
  });

  describe('resetPassword()', () => {
    it('should update password_hashed and last_password', () => {
      const user = createValidUser();
      user.resetPassword('new_hashed_value');
      expect(user.password_hashed).toBe('new_hashed_value');
      expect(user.last_password).toBe('new_hashed_value');
    });

    it('should work even when user is not verified', () => {
      const user = createValidUser({ is_verified: false });
      expect(() => user.resetPassword('new_hashed_value')).not.toThrow();
      expect(user.password_hashed).toBe('new_hashed_value');
    });

    it('should work even when user is deleted', () => {
      const user = createValidUser({ is_deleted: true });
      expect(() => user.resetPassword('new_hashed_value')).not.toThrow();
    });
  });
});
