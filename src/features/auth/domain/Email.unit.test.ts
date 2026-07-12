import { describe, expect, it } from "vitest";
import { Email, InvalidEmailFormatError } from "@/features/auth/domain/Email";

describe("Email", () => {
  it("should normalize an address by trimming whitespace and lowercasing it", () => {
    const email = new Email("  Aitor.Santana@Example.COM  ");

    expect(email.toString()).toBe("aitor.santana@example.com");
  });

  it("should consider two emails equal when they normalize to the same address", () => {
    const first = new Email("aitor@example.com");
    const second = new Email("  AITOR@EXAMPLE.com");

    expect(first.equals(second)).toBe(true);
  });

  it("should consider two different addresses not equal", () => {
    const first = new Email("aitor@example.com");
    const second = new Email("other@example.com");

    expect(first.equals(second)).toBe(false);
  });

  it("should reject an address without an @ symbol", () => {
    expect(() => new Email("not-an-email")).toThrow(InvalidEmailFormatError);
  });

  it("should reject an address without a domain", () => {
    expect(() => new Email("aitor@")).toThrow(InvalidEmailFormatError);
  });

  it("should reject an empty string", () => {
    expect(() => new Email("")).toThrow(InvalidEmailFormatError);
  });
});
