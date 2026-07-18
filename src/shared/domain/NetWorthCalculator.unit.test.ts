import { describe, expect, it } from "vitest";
import { NetWorthCalculator } from "@/shared/domain/NetWorthCalculator";

describe("NetWorthCalculator", () => {
  it("should compute the headline net worth as assets minus only short-term liabilities", () => {
    const breakdown = new NetWorthCalculator().calculate(50000, 8000, 100000);

    expect(breakdown).toEqual({
      assetsTotal: 50000,
      shortTermLiabilitiesTotal: 8000,
      longTermLiabilitiesTotal: 100000,
      liabilitiesTotal: 108000,
      netWorth: 42000,
      netWorthIncludingAllDebt: -58000,
    });
  });

  it("should produce a negative headline net worth when short-term liabilities exceed assets", () => {
    const breakdown = new NetWorthCalculator().calculate(3000, 10000, 0);

    expect(breakdown.netWorth).toBe(-7000);
  });

  it("should equal the assets total when there are no liabilities at all", () => {
    const breakdown = new NetWorthCalculator().calculate(15000, 0, 0);

    expect(breakdown.netWorth).toBe(15000);
    expect(breakdown.netWorthIncludingAllDebt).toBe(15000);
  });

  it("should equal the headline net worth when there is no long-term debt", () => {
    const breakdown = new NetWorthCalculator().calculate(20000, 5000, 0);

    expect(breakdown.netWorthIncludingAllDebt).toBe(breakdown.netWorth);
  });
});
