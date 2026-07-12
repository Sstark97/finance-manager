import { Email, InvalidEmailFormatError } from "@/features/auth/domain/Email";
import type { User } from "@/features/auth/domain/User";
import type { UserRepository } from "@/features/auth/application/UserRepository";
import type { PasswordHasher } from "@/features/auth/application/PasswordHasher";

export interface AuthenticateWithCredentialsUseCase {
  invoke(email: string, password: string): Promise<User | null>;
}

export class AuthenticateWithCredentials implements AuthenticateWithCredentialsUseCase {
  // Valid-looking bcrypt hash with no known plaintext, verified against unknown/passwordless
  // accounts so a failed login takes the same time whether or not the email is registered.
  private static readonly UNMATCHABLE_PASSWORD_HASH =
    "$2b$10$e2xEW3clwIb2P5Hzn1/aueUZzZbn24XN7xX5qfuoE.zxZWjhUj23S";

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async invoke(email: string, password: string): Promise<User | null> {
    const normalizedEmail = this.parseEmailOrNull(email);
    const credentials = normalizedEmail === null ? null : await this.userRepository.findCredentialsByEmail(normalizedEmail);

    const passwordHash = credentials?.passwordHash ?? AuthenticateWithCredentials.UNMATCHABLE_PASSWORD_HASH;
    const isPasswordValid = await this.passwordHasher.verify(password, passwordHash);

    return credentials !== null && isPasswordValid ? credentials.user : null;
  }

  private parseEmailOrNull(rawEmail: string): string | null {
    try {
      return new Email(rawEmail).toString();
    } catch (error) {
      if (error instanceof InvalidEmailFormatError) {
        return null;
      }
      throw error;
    }
  }
}
