import { CATEGORIES } from "@/features/budget/domain/config";
import type { CategoryId, Month, Budget } from "@/features/budget/domain/types";
import { monthlyBudgetCalculator, type MonthlyBudgetResult } from "@/features/budget/domain/MonthlyBudgetCalculator";

export interface OverspentCategory {
  categoryId: CategoryId;
  categoryName: string;
  budgeted: number;
  realized: number;
  overspentBy: number;
}

export interface MonthlyRecap {
  result: MonthlyBudgetResult;
  overspentCategories: OverspentCategory[];
  previousMonth: Month | null;
  previousResult: MonthlyBudgetResult | null;
  surplusDeltaVsPreviousMonth: number | null;
  incomeDeltaVsPreviousMonth: number | null;
  totalActualDeltaVsPreviousMonth: number | null;
}

export class MonthlyRecapCalculator {
  calculate(month: Month, months: Month[], base: Budget): MonthlyRecap {
    const result = monthlyBudgetCalculator.calculate(month, base);
    const overspentCategories = this.findOverspentCategories(result);
    const previousMonth = this.findPreviousMonth(month, months);
    const previousResult = previousMonth ? monthlyBudgetCalculator.calculate(previousMonth, base) : null;

    return {
      result,
      overspentCategories,
      previousMonth,
      previousResult,
      surplusDeltaVsPreviousMonth: previousResult ? result.surplus - previousResult.surplus : null,
      incomeDeltaVsPreviousMonth: previousResult ? result.income - previousResult.income : null,
      totalActualDeltaVsPreviousMonth: previousResult ? result.totalActual - previousResult.totalActual : null,
    };
  }

  private findOverspentCategories(result: MonthlyBudgetResult): OverspentCategory[] {
    return CATEGORIES.filter(category => {
      const realizedValue = result.realized[category.id];
      if (realizedValue == null) return false;
      const budgetedValue = result.values[category.id];
      return category.type === "gasto" ? realizedValue > budgetedValue : realizedValue < budgetedValue;
    }).map(category => {
      const realizedValue = result.realized[category.id] as number;
      const budgetedValue = result.values[category.id];
      return {
        categoryId: category.id,
        categoryName: category.name,
        budgeted: budgetedValue,
        realized: realizedValue,
        overspentBy: Math.abs(realizedValue - budgetedValue),
      };
    });
  }

  private findPreviousMonth(month: Month, months: Month[]): Month | null {
    const monthsSortedByDate = [...months].sort((firstMonth, secondMonth) => firstMonth.date.getTime() - secondMonth.date.getTime());
    const monthIndex = monthsSortedByDate.findIndex(candidate => candidate.id === month.id);
    if (monthIndex <= 0) return null;
    return monthsSortedByDate[monthIndex - 1];
  }
}

export const monthlyRecapCalculator = new MonthlyRecapCalculator();
