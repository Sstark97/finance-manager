import { CATEGORIES } from "@/features/budget/domain/config";
import type { CategoryId, Month, Budget } from "@/features/budget/domain/types";

export interface MonthlyBudgetResult {
  values: Record<CategoryId, number>;
  income: number;
  totalBudgeted: number;
  surplus: number;
  actual: Record<CategoryId, number | null>;
  totalActual: number;
}

export class MonthlyBudgetCalculator {
  calculate(month: Month, base: Budget): MonthlyBudgetResult {
    const values = {} as Record<CategoryId, number>;
    CATEGORIES.forEach(category => {
      const baseTarget = month.overrides?.[category.id] ?? base[category.id];
      const categoryEventsAmount = (month.events || [])
        .filter(event => event.category === category.id)
        .reduce((sum, event) => sum + (event.amount || 0), 0);
      values[category.id] = baseTarget + categoryEventsAmount;
    });
    const incomeEvents = (month.events || [])
      .filter(event => event.category === "ingreso")
      .reduce((sum, event) => sum + (event.amount || 0), 0);
    const income = (month.netIncomeOverride ?? base.ingresoNeto) + incomeEvents;
    const totalBudgeted = CATEGORIES.reduce((sum, category) => sum + values[category.id], 0);
    const surplus = income - totalBudgeted;
    const actual = {} as Record<CategoryId, number | null>;
    CATEGORIES.forEach(category => {
      const actualValue = month.actual ? month.actual[category.id] : undefined;
      actual[category.id] = actualValue != null ? actualValue : null;
    });
    const totalActual = CATEGORIES.reduce((sum, category) => {
      const actualValue = actual[category.id];
      return sum + (actualValue != null ? actualValue : values[category.id]);
    }, 0);
    return { values, income, totalBudgeted, surplus, actual, totalActual };
  }
}

export const monthlyBudgetCalculator = new MonthlyBudgetCalculator();
