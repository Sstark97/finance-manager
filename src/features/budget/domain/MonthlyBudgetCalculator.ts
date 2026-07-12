import { CATEGORIES } from "@/features/budget/domain/config";
import type { CategoryId, Month, Budget } from "@/features/budget/domain/types";

export interface MonthlyBudgetResult {
  values: Record<CategoryId, number>;
  income: number;
  totalBudgeted: number;
  surplus: number;
  actual: Record<CategoryId, number | null>;
  realized: Record<CategoryId, number | null>;
  totalActual: number;
}

export class MonthlyBudgetCalculator {
  calculate(month: Month, base: Budget): MonthlyBudgetResult {
    const values = {} as Record<CategoryId, number>;
    const categoryEventsById = {} as Record<CategoryId, number>;
    CATEGORIES.forEach(category => {
      const baseTarget = month.overrides?.[category.id] ?? base[category.id];
      categoryEventsById[category.id] = (month.events || [])
        .filter(event => event.category === category.id)
        .reduce((sum, event) => sum + (event.amount || 0), 0);
      values[category.id] = baseTarget;
    });
    const incomeEvents = (month.events || [])
      .filter(event => event.category === "ingreso")
      .reduce((sum, event) => sum + (event.amount || 0), 0);
    const income = (month.netIncomeOverride ?? base.ingresoNeto) + incomeEvents;
    const totalBudgeted = CATEGORIES.reduce((sum, category) => sum + values[category.id], 0);
    const actual = {} as Record<CategoryId, number | null>;
    const realized = {} as Record<CategoryId, number | null>;
    CATEGORIES.forEach(category => {
      const manualActual = month.actual ? month.actual[category.id] : undefined;
      actual[category.id] = manualActual != null ? manualActual : null;
      const categoryEvents = categoryEventsById[category.id];
      const isRegistered = actual[category.id] != null || categoryEvents > 0;
      realized[category.id] = isRegistered ? (actual[category.id] ?? values[category.id]) + categoryEvents : null;
    });
    const totalActual = CATEGORIES.reduce((sum, category) => {
      const realizedValue = realized[category.id];
      return sum + (realizedValue != null ? realizedValue : values[category.id]);
    }, 0);
    const surplus = income - totalActual;
    return { values, income, totalBudgeted, surplus, actual, realized, totalActual };
  }
}

export const monthlyBudgetCalculator = new MonthlyBudgetCalculator();
