import { User } from "../../../../src/modules/user/entity/user";
import { AppError } from "../../../../src/modules/errors/errors.global";

describe("User Entity", () => {
  const validUserProps = {
    id: "uuid-1",
    name: "John Doe",
    email: "john@example.com",
    password_hashed: "HashedPass123!",
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false,
  };

  describe("createForDatabase", () => {
    it("should return correct name/email/password object", () => {
      const result = User.createForDatabase(
        validUserProps.name,
        validUserProps.email,
        validUserProps.password_hashed
      );

      expect(result).toEqual({
        name: validUserProps.name,
        email: validUserProps.email,
        password_hashed: validUserProps.password_hashed,
      });
    });
  });

  describe("restoreUser", () => {
    it("should create an instance and trigger validation", () => {
      const user = User.restoreUser(
        validUserProps.id,
        validUserProps.name,
        validUserProps.email,
        validUserProps.password_hashed,
        validUserProps.created_at,
        validUserProps.updated_at,
        validUserProps.is_deleted
      );

      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe(validUserProps.id);
      expect(user.name).toBe(validUserProps.name);
      expect(user.email).toBe(validUserProps.email);
      expect(user.password_hashed).toBe(validUserProps.password_hashed);
      expect(user.is_deleted).toBe(validUserProps.is_deleted);
    });

    it("should throw AppError if validation fails", () => {
      expect(() => {
        User.restoreUser(
          validUserProps.id,
          "J", // Invalid name (too short)
          validUserProps.email,
          validUserProps.password_hashed,
          validUserProps.created_at,
          validUserProps.updated_at,
          validUserProps.is_deleted
        );
      }).toThrow(AppError);
    });
  });

  describe("checkIfDeleted", () => {
    it("should return false for active user", () => {
      const user = User.restoreUser(
        validUserProps.id,
        validUserProps.name,
        validUserProps.email,
        validUserProps.password_hashed,
        validUserProps.created_at,
        validUserProps.updated_at,
        false
      );
      expect(user.checkIfDeleted()).toBe(false);
    });

    it("should return true for deleted user", () => {
      const user = User.restoreUser(
        validUserProps.id,
        validUserProps.name,
        validUserProps.email,
        validUserProps.password_hashed,
        validUserProps.created_at,
        validUserProps.updated_at,
        true
      );
      expect(user.checkIfDeleted()).toBe(true);
    });
  });

  describe("Update operations on active user", () => {
    let user: User;

    beforeEach(() => {
      user = User.restoreUser(
        validUserProps.id,
        validUserProps.name,
        validUserProps.email,
        validUserProps.password_hashed,
        validUserProps.created_at,
        validUserProps.updated_at,
        false
      );
    });

    it("should update name", () => {
      const newName = "Jane Doe";
      user.updateName(newName);
      expect(user.name).toBe(newName);
    });

    it("should update email", () => {
      const newEmail = "jane@example.com";
      user.updateEmail(newEmail);
      expect(user.email).toBe(newEmail);
    });

    it("should update password", () => {
      const newPassword = "NewHashedPass123!";
      user.updatePassword(newPassword);
      expect(user.password_hashed).toBe(newPassword);
    });

    it("should set is_deleted to true when delete is called", () => {
      user.delete();
      expect(user.is_deleted).toBe(true);
    });
  });

  describe("Operations on deleted user", () => {
    let user: User;

    beforeEach(() => {
      user = User.restoreUser(
        validUserProps.id,
        validUserProps.name,
        validUserProps.email,
        validUserProps.password_hashed,
        validUserProps.created_at,
        validUserProps.updated_at,
        true
      );
    });

    it("should throw AppError when updateName is called", () => {
      expect(() => user.updateName("Jane Doe")).toThrow(AppError);
    });

    it("should throw AppError when updateEmail is called", () => {
      expect(() => user.updateEmail("jane@example.com")).toThrow(AppError);
    });

    it("should throw AppError when updatePassword is called", () => {
      expect(() => user.updatePassword("NewHashedPass123!")).toThrow(AppError);
    });

    it("should throw AppError when delete is called", () => {
      expect(() => user.delete()).toThrow(AppError);
    });
  });
});
