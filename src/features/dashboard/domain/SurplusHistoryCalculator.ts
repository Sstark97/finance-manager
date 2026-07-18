import { monthAvailability } from "@/features/budget/domain/MonthAvailability";
import { monthlyBudgetCalculator } from "@/features/budget/domain/MonthlyBudgetCalculator";
import type { Budget, Month } from "@/features/budget/domain/types";

export interface SurplusHistoryPoint {
  label: string;
  surplus: number;
}

const DEFAULT_RECENT_MONTHS_COUNT = 6;

export class SurplusHistoryCalculator {
  calculateRecentMonths(months: Month[], baseBudget: Budget, monthsCount: number = DEFAULT_RECENT_MONTHS_COUNT): SurplusHistoryPoint[] {
    const availableMonths = months.filter((month) => monthAvailability.isAvailable(month.date));
    return availableMonths.slice(-monthsCount).map((month) => ({
      label: month.label,
      surplus: monthlyBudgetCalculator.calculate(month, baseBudget).surplus,
    }));
  }
}

export const surplusHistoryCalculator = new SurplusHistoryCalculator();
