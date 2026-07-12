import type { User } from "@/features/auth/domain/User";
import type { users } from "@/infrastructure/db/schema";

type UserRow = typeof users.$inferSelect;
type NewUserRow = typeof users.$inferInsert;

export class UserWithoutEmailError extends Error {
  constructor(userId: string) {
    super(`User row "${userId}" has no email`);
    this.name = "UserWithoutEmailError";
  }
}

export class UserRowMapper {
  toDomain(row: UserRow): User {
    if (row.email === null) {
      throw new UserWithoutEmailError(row.id);
    }
    return {
      id: row.id,
      email: row.email,
      displayName: row.name,
      avatarUrl: row.image,
    };
  }

  toRow(user: User, passwordHash: string | null): NewUserRow {
    return {
      id: user.id,
      name: user.displayName,
      email: user.email,
      image: user.avatarUrl,
      passwordHash,
    };
  }
}
