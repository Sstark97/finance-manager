import type { Budget, FixedExpenseItem, Month } from "@/features/budget/domain/types";

export interface BudgetSnapshot {
  baseBudget: Budget | null;
  fixedExpenseItems: FixedExpenseItem[];
  months: Month[];
}
