import { eq } from "drizzle-orm";
import type { User } from "@/features/auth/domain/User";
import type { UserCredentials, UserRepository } from "@/features/auth/application/UserRepository";
import type { Database } from "@/infrastructure/db/client";
import { users as usersTable } from "@/infrastructure/db/schema";
import { UserRowMapper } from "@/features/auth/infrastructure/UserRowMapper";

export class TursoUserRepository implements UserRepository {
  constructor(
    private readonly database: Database,
    private readonly mapper: UserRowMapper = new UserRowMapper(),
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.database.select().from(usersTable).where(eq(usersTable.email, email));
    if (!row) {
      return null;
    }
    return this.mapper.toDomain(row);
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.database.select().from(usersTable).where(eq(usersTable.id, id));
    if (!row) {
      return null;
    }
    return this.mapper.toDomain(row);
  }

  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    const [row] = await this.database.select().from(usersTable).where(eq(usersTable.email, email));
    if (!row) {
      return null;
    }
    return { user: this.mapper.toDomain(row), passwordHash: row.passwordHash };
  }

  async create(user: User, passwordHash: string | null): Promise<void> {
    await this.database.insert(usersTable).values(this.mapper.toRow(user, passwordHash));
  }
}
