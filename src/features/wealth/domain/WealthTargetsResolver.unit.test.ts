import { describe, expect, it } from "vitest";
import { WealthTargetsResolver } from "@/features/wealth/domain/WealthTargetsResolver";
import { WEALTH_TARGETS_INITIAL } from "@/features/wealth/data/wealthTargets";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";

describe("WealthTargetsResolver", () => {
  const resolver = new WealthTargetsResolver();

  it("should fall back to the default wealth targets when none have been configured", () => {
    expect(resolver.resolve(null)).toEqual(WEALTH_TARGETS_INITIAL);
  });

  it("should return the configured wealth targets unchanged when they exist", () => {
    const configured: WealthTargets = { ...WEALTH_TARGETS_INITIAL, emergencyFund: 9000 };

    expect(resolver.resolve(configured)).toEqual(configured);
  });
});
