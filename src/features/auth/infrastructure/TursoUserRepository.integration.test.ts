import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TursoUserRepository } from "@/features/auth/infrastructure/TursoUserRepository";
import { TestDatabaseFactory, type TestDatabase } from "@/infrastructure/db/__fixtures__/TestDatabaseFactory";
import type { User } from "@/features/auth/domain/User";

describe("TursoUserRepository", () => {
  let testDatabase: TestDatabase;
  let repository: TursoUserRepository;

  beforeEach(async () => {
    testDatabase = await new TestDatabaseFactory().create();
    repository = new TursoUserRepository(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return null when no user is registered with the given email", async () => {
    const user = await repository.findByEmail("unknown@example.com");

    expect(user).toBeNull();
  });

  it("should round-trip a created user through create and findByEmail", async () => {
    const newUser: User = { id: "user-1", email: "aitor@example.com", displayName: "Aitor", avatarUrl: null };

    await repository.create(newUser, "hashed-secret");
    const foundUser = await repository.findByEmail("aitor@example.com");

    expect(foundUser).toEqual(newUser);
  });

  it("should find a created user by id", async () => {
    const newUser: User = { id: "user-1", email: "aitor@example.com", displayName: "Aitor", avatarUrl: null };

    await repository.create(newUser, "hashed-secret");
    const foundUser = await repository.findById("user-1");

    expect(foundUser).toEqual(newUser);
  });

  it("should return the user and password hash for a registered email", async () => {
    const newUser: User = { id: "user-1", email: "aitor@example.com", displayName: "Aitor", avatarUrl: null };

    await repository.create(newUser, "hashed-secret");
    const credentials = await repository.findCredentialsByEmail("aitor@example.com");

    expect(credentials).toEqual({ user: newUser, passwordHash: "hashed-secret" });
  });

  it("should return null credentials for an unknown email", async () => {
    const credentials = await repository.findCredentialsByEmail("unknown@example.com");

    expect(credentials).toBeNull();
  });

  it("should reject creating a second user with the same email", async () => {
    const firstUser: User = { id: "user-1", email: "aitor@example.com", displayName: "Aitor", avatarUrl: null };
    const secondUser: User = { id: "user-2", email: "aitor@example.com", displayName: "Other Aitor", avatarUrl: null };

    await repository.create(firstUser, "hashed-secret");

    await expect(repository.create(secondUser, "another-hash")).rejects.toThrow();
  });
});
