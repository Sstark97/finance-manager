import type { Budget, FixedExpenseItem } from "@/features/budget/domain/types";

export interface BudgetRepository {
  findBase(): Promise<Budget | null>;
  saveBase(budget: Budget): Promise<void>;
  findFixedExpenseItems(): Promise<FixedExpenseItem[]>;
  saveFixedExpenseItems(items: FixedExpenseItem[]): Promise<void>;
}
