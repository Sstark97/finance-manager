import { describe, expect, it } from "vitest";
import { RegisterUser, EmailAlreadyRegisteredError } from "@/features/auth/application/RegisterUser";
import type { UserCredentials, UserRepository } from "@/features/auth/application/UserRepository";
import type { PasswordHasher } from "@/features/auth/application/PasswordHasher";
import type { User } from "@/features/auth/domain/User";

class InMemoryUserRepository implements UserRepository {
  private readonly credentialsByEmail = new Map<string, UserCredentials>();
  createdUser: User | null = null;
  createdPasswordHash: string | null = null;

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

  async create(user: User, passwordHash: string | null): Promise<void> {
    this.createdUser = user;
    this.createdPasswordHash = passwordHash;
  }
}

class StubPasswordHasher implements PasswordHasher {
  constructor(private readonly hashedValue: string) {}

  async hash(): Promise<string> {
    return this.hashedValue;
  }

  async verify(): Promise<boolean> {
    throw new Error("not used in this test");
  }
}

describe("RegisterUser", () => {
  it("should hash the password and persist the new user through the repository", async () => {
    const repository = new InMemoryUserRepository();
    const passwordHasher = new StubPasswordHasher("hashed-secret");
    const useCase = new RegisterUser(repository, passwordHasher);

    const registeredUser = await useCase.invoke({ email: "Aitor@Example.com", password: "plain-secret", displayName: "Aitor" });

    expect(registeredUser.email).toBe("aitor@example.com");
    expect(registeredUser.displayName).toBe("Aitor");
    expect(repository.createdUser).toEqual(registeredUser);
    expect(repository.createdPasswordHash).toBe("hashed-secret");
  });

  it("should reject registration when the email is already registered", async () => {
    const repository = new InMemoryUserRepository();
    const existingUser: User = { id: "existing-user", email: "aitor@example.com", displayName: "Aitor", avatarUrl: null };
    repository.seed(existingUser, "existing-hash");
    const useCase = new RegisterUser(repository, new StubPasswordHasher("hashed-secret"));

    await expect(useCase.invoke({ email: "aitor@example.com", password: "plain-secret", displayName: "Aitor" })).rejects.toThrow(
      EmailAlreadyRegisteredError,
    );
  });
});
