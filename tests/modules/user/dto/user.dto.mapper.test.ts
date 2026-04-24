import { UserDtoMapper } from "../../../../src/modules/user/dto/user.dto.mapper";
import { User } from "../../../../src/modules/user/entity/user";

describe("UserDtoMapper Unit Tests", () => {
  const mapper = UserDtoMapper.create();
  
  const now = new Date();
  const user = User.restoreUser(
    "uuid-1",
    "John Doe",
    "john@example.com",
    "hashed-pass",
    now,
    now,
    false,
    true,
    "hashed-pass",
    null,
    null
  );

  describe("mapToUserDto", () => {
    it("should map User entity to UserDtoForSelf", () => {
      const dto = mapper.mapToUserDto(user);

      expect(dto).toEqual({
        id: "uuid-1",
        name: "John Doe",
        email: "john@example.com",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        is_verified: true,
      });
    });
  });

  describe("mapToUserDtoForOthers", () => {
    it("should map User entity to UserDtoForOthers (no email, no is_verified)", () => {
      const dto = mapper.mapToUserDtoForOthers(user);

      expect(dto).toEqual({
        id: "uuid-1",
        name: "John Doe",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
      expect(dto).not.toHaveProperty("email");
      expect(dto).not.toHaveProperty("is_verified");
    });
  });
});
