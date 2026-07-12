import { idGenerator } from "@/lib/IdGenerator";
import { Email } from "@/features/auth/domain/Email";
import type { User } from "@/features/auth/domain/User";
import type { UserRepository } from "@/features/auth/application/UserRepository";
import type { PasswordHasher } from "@/features/auth/application/PasswordHasher";

export interface RegisterUserRequest {
  email: string;
  password: string;
  displayName: string | null;
}

export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`An account with the email "${email}" already exists`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export interface RegisterUserUseCase {
  invoke(request: RegisterUserRequest): Promise<User>;
}

export class RegisterUser implements RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async invoke(request: RegisterUserRequest): Promise<User> {
    const email = new Email(request.email);
    await this.rejectIfEmailAlreadyRegistered(email);

    const passwordHash = await this.passwordHasher.hash(request.password);
    const user: User = {
      id: idGenerator.generate(),
      email: email.toString(),
      displayName: request.displayName,
      avatarUrl: null,
    };

    await this.userRepository.create(user, passwordHash);
    return user;
  }

  private async rejectIfEmailAlreadyRegistered(email: Email): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email.toString());
    if (existingUser !== null) {
      throw new EmailAlreadyRegisteredError(email.toString());
    }
  }
}
