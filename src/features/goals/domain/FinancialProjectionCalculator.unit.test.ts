import { describe, expect, it } from "vitest";
import { FinancialProjectionCalculator } from "@/features/goals/domain/FinancialProjectionCalculator";

describe("FinancialProjectionCalculator", () => {
  it("should reach the target within the expected number of months under monthly compounding", () => {
    const initial = 1000;
    const contribution = 100;
    const annualReturn = 0.07;
    const target = 2000;

    const result = new FinancialProjectionCalculator().project({ initial, contribution, annualReturn, target });

    expect(result.months).not.toBeNull();
    expect(result.finalCapital).toBeGreaterThanOrEqual(target);

    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
    let capitalOneMonthBefore = initial;
    for (let monthIndex = 1; monthIndex < (result.months ?? 0); monthIndex++) {
      capitalOneMonthBefore = capitalOneMonthBefore * (1 + monthlyReturn) + contribution;
    }
    expect(capitalOneMonthBefore).toBeLessThan(target);
  });

  it("should return months null when the target is not reached within maxMonths", () => {
    const result = new FinancialProjectionCalculator().project({
      initial: 0, contribution: 0, annualReturn: 0, target: 1000, maxMonths: 12,
    });

    expect(result.months).toBeNull();
    expect(result.finalCapital).toBe(0);
  });

  it("should keep finalCapital coherent with the requested capitalization when goal is unreachable", () => {
    const initial = 100;
    const contribution = 50;
    const maxMonths = 6;

    const result = new FinancialProjectionCalculator().project({
      initial, contribution, annualReturn: 0, target: 1_000_000, maxMonths,
    });

    expect(result.months).toBeNull();
    expect(result.finalCapital).toBeCloseTo(initial + contribution * maxMonths);
  });
});
