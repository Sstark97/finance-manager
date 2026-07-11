import type { Budget, FixedExpenseItem, Month } from "@/features/budget/domain/types";

export interface BudgetSnapshot {
  baseBudget: Budget;
  fixedExpenseItems: FixedExpenseItem[];
  months: Month[];
}
