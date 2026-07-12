import { describe, expect, it } from "vitest";
import { BcryptPasswordHasher } from "@/features/auth/infrastructure/BcryptPasswordHasher";

describe("BcryptPasswordHasher", () => {
  it("should verify a plain text password against its own hash", async () => {
    const hasher = new BcryptPasswordHasher();

    const passwordHash = await hasher.hash("correct-horse-battery-staple");

    await expect(hasher.verify("correct-horse-battery-staple", passwordHash)).resolves.toBe(true);
  });

  it("should reject a plain text password that does not match the hash", async () => {
    const hasher = new BcryptPasswordHasher();

    const passwordHash = await hasher.hash("correct-horse-battery-staple");

    await expect(hasher.verify("wrong-password", passwordHash)).resolves.toBe(false);
  });
});
