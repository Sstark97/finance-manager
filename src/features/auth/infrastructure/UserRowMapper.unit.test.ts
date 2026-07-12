import { describe, expect, it } from "vitest";
import { UserRowMapper, UserWithoutEmailError } from "@/features/auth/infrastructure/UserRowMapper";
import type { User } from "@/features/auth/domain/User";
import type { users } from "@/infrastructure/db/schema";

type UserRow = typeof users.$inferSelect;

describe("UserRowMapper", () => {
  it("should map a row to a domain user", () => {
    const mapper = new UserRowMapper();
    const row: UserRow = {
      id: "user-1",
      name: "Aitor",
      email: "aitor@example.com",
      emailVerified: null,
      image: "https://example.com/avatar.png",
      passwordHash: "hashed-secret",
    };

    const user = mapper.toDomain(row);

    expect(user).toEqual<User>({
      id: "user-1",
      email: "aitor@example.com",
      displayName: "Aitor",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("should throw when the row has no email", () => {
    const mapper = new UserRowMapper();
    const row: UserRow = { id: "user-1", name: "Aitor", email: null, emailVerified: null, image: null, passwordHash: null };

    expect(() => mapper.toDomain(row)).toThrow(UserWithoutEmailError);
  });

  it("should map a domain user and password hash to an insertable row", () => {
    const mapper = new UserRowMapper();
    const user: User = { id: "user-1", email: "aitor@example.com", displayName: "Aitor", avatarUrl: null };

    const row = mapper.toRow(user, "hashed-secret");

    expect(row).toEqual({ id: "user-1", name: "Aitor", email: "aitor@example.com", image: null, passwordHash: "hashed-secret" });
  });
});
