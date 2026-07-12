import type { Budget, FixedExpenseItem } from "@/features/budget/domain/types";

export interface BudgetRepository {
  findBase(userId: string): Promise<Budget | null>;
  saveBase(userId: string, budget: Budget): Promise<void>;
  findFixedExpenseItems(userId: string): Promise<FixedExpenseItem[]>;
  saveFixedExpenseItems(userId: string, items: FixedExpenseItem[]): Promise<void>;
}
