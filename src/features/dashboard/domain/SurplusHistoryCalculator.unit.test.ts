import { describe, expect, it } from "vitest";
import { SurplusHistoryCalculator } from "@/features/dashboard/domain/SurplusHistoryCalculator";
import { monthFactory } from "@/features/budget/domain/MonthFactory";
import { monthlyBudgetCalculator } from "@/features/budget/domain/MonthlyBudgetCalculator";
import type { Budget, Month } from "@/features/budget/domain/types";

const SAMPLE_BUDGET: Budget = { ingresoNeto: 1800, gastosFijos: 700, inversion: 300, fondoEmergencia: 300, ocio: 300, caprichos: 200 };

function monthMonthsAgo(monthsAgo: number): Month {
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
  return monthFactory.create(targetDate.getFullYear(), targetDate.getMonth());
}

function monthsFromNow(monthsAhead: number): Month {
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + monthsAhead, 1);
  return monthFactory.create(targetDate.getFullYear(), targetDate.getMonth());
}

describe("SurplusHistoryCalculator", () => {
  const calculator = new SurplusHistoryCalculator();

  it("should return the surplus for each available month", () => {
    const olderMonth = monthMonthsAgo(1);
    const currentMonth = monthMonthsAgo(0);

    const history = calculator.calculateRecentMonths([olderMonth, currentMonth], SAMPLE_BUDGET);

    expect(history).toEqual([
      { label: olderMonth.label, surplus: monthlyBudgetCalculator.calculate(olderMonth, SAMPLE_BUDGET).surplus },
      { label: currentMonth.label, surplus: monthlyBudgetCalculator.calculate(currentMonth, SAMPLE_BUDGET).surplus },
    ]);
  });

  it("should exclude months that are not yet available", () => {
    const currentMonth = monthMonthsAgo(0);
    const futureMonth = monthsFromNow(1);

    const history = calculator.calculateRecentMonths([currentMonth, futureMonth], SAMPLE_BUDGET);

    expect(history.map((point) => point.label)).toEqual([currentMonth.label]);
  });

  it("should return only the most recent months up to the requested count", () => {
    const months = Array.from({ length: 8 }, (_unused, monthIndex) => monthMonthsAgo(7 - monthIndex));

    const history = calculator.calculateRecentMonths(months, SAMPLE_BUDGET, 6);

    expect(history.map((point) => point.label)).toEqual(months.slice(-6).map((month) => month.label));
  });
});
