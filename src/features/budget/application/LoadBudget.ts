import type { BudgetSnapshot } from "@/features/budget/application/BudgetSnapshot";
import type { BudgetRepository } from "@/features/budget/application/BudgetRepository";
import type { MonthRepository } from "@/features/budget/application/MonthRepository";

export interface LoadBudgetUseCase {
  invoke(userId: string): Promise<BudgetSnapshot>;
}

export class LoadBudget implements LoadBudgetUseCase {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly monthRepository: MonthRepository,
  ) {}

  async invoke(userId: string): Promise<BudgetSnapshot> {
    const [baseBudget, fixedExpenseItems, months] = await Promise.all([
      this.budgetRepository.findBase(userId),
      this.budgetRepository.findFixedExpenseItems(userId),
      this.monthRepository.findAll(userId),
    ]);
    return { baseBudget, fixedExpenseItems, months };
  }
}
