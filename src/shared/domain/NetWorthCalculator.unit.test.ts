import { describe, expect, it } from "vitest";
import { NetWorthCalculator } from "@/shared/domain/NetWorthCalculator";

describe("NetWorthCalculator", () => {
  it("should compute net worth as assets minus liabilities", () => {
    const breakdown = new NetWorthCalculator().calculate(50000, 8000);

    expect(breakdown).toEqual({ assetsTotal: 50000, liabilitiesTotal: 8000, netWorth: 42000 });
  });

  it("should produce a negative net worth when liabilities exceed assets", () => {
    const breakdown = new NetWorthCalculator().calculate(3000, 10000);

    expect(breakdown.netWorth).toBe(-7000);
  });

  it("should equal the assets total when there are no liabilities", () => {
    const breakdown = new NetWorthCalculator().calculate(15000, 0);

    expect(breakdown.netWorth).toBe(15000);
  });
});
