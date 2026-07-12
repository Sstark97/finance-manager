const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class InvalidEmailFormatError extends Error {
  constructor(rawValue: string) {
    super(`"${rawValue}" is not a valid email address`);
    this.name = "InvalidEmailFormatError";
  }
}

export class Email {
  private readonly normalizedValue: string;

  constructor(rawValue: string) {
    const normalizedValue = rawValue.trim().toLowerCase();
    if (!EMAIL_FORMAT_PATTERN.test(normalizedValue)) {
      throw new InvalidEmailFormatError(rawValue);
    }
    this.normalizedValue = normalizedValue;
  }

  toString(): string {
    return this.normalizedValue;
  }

  equals(other: Email): boolean {
    return this.normalizedValue === other.normalizedValue;
  }
}
