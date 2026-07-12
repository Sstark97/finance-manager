import type { User } from "@/features/auth/domain/User";

export interface UserCredentials {
  user: User;
  passwordHash: string | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
  create(user: User, passwordHash: string | null): Promise<void>;
}
