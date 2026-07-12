import { describe, expect, it } from "vitest";
import { AuthenticateWithCredentials } from "@/features/auth/application/AuthenticateWithCredentials";
import type { UserCredentials, UserRepository } from "@/features/auth/application/UserRepository";
import type { PasswordHasher } from "@/features/auth/application/PasswordHasher";
import type { User } from "@/features/auth/domain/User";

class InMemoryUserRepository implements UserRepository {
  private readonly credentialsByEmail = new Map<string, UserCredentials>();

  seed(user: User, passwordHash: string): void {
    this.credentialsByEmail.set(user.email, { user, passwordHash });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.credentialsByEmail.get(email)?.user ?? null;
  }

  async findById(): Promise<User | null> {
    throw new Error("not used in this test");
  }

  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    return this.credentialsByEmail.get(email) ?? null;
  }

  async create(): Promise<void> {
    throw new Error("not used in this test");
  }
}

class StubPasswordHasher implements PasswordHasher {
  constructor(private readonly validPlainTextPassword: string) {}

  async hash(): Promise<string> {
    throw new Error("not used in this test");
  }

  async verify(plainTextPassword: string): Promise<boolean> {
    return plainTextPassword === this.validPlainTextPassword;
  }
}

describe("AuthenticateWithCredentials", () => {
  const registeredUser: User = { id: "user-1", email: "aitor@example.com", displayName: "Aitor", avatarUrl: null };

  it("should return the user when the password matches the stored hash", async () => {
    const repository = new InMemoryUserRepository();
    repository.seed(registeredUser, "hashed-secret");
    const useCase = new AuthenticateWithCredentials(repository, new StubPasswordHasher("correct-password"));

    const authenticatedUser = await useCase.invoke("aitor@example.com", "correct-password");

    expect(authenticatedUser).toEqual(registeredUser);
  });

  it("should return null when the password does not match the stored hash", async () => {
    const repository = new InMemoryUserRepository();
    repository.seed(registeredUser, "hashed-secret");
    const useCase = new AuthenticateWithCredentials(repository, new StubPasswordHasher("correct-password"));

    const authenticatedUser = await useCase.invoke("aitor@example.com", "wrong-password");

    expect(authenticatedUser).toBeNull();
  });

  it("should return null when no user is registered with the given email", async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new AuthenticateWithCredentials(repository, new StubPasswordHasher("correct-password"));

    const authenticatedUser = await useCase.invoke("unknown@example.com", "correct-password");

    expect(authenticatedUser).toBeNull();
  });

  it("should return null when the email has an invalid format", async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new AuthenticateWithCredentials(repository, new StubPasswordHasher("correct-password"));

    const authenticatedUser = await useCase.invoke("not-an-email", "correct-password");

    expect(authenticatedUser).toBeNull();
  });
});
