import type { BudgetSnapshot } from "@/features/budget/application/BudgetSnapshot";
import type { BudgetRepository } from "@/features/budget/application/BudgetRepository";
import type { MonthRepository } from "@/features/budget/application/MonthRepository";

export interface LoadBudgetUseCase {
  invoke(): Promise<BudgetSnapshot>;
}

export class LoadBudget implements LoadBudgetUseCase {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly monthRepository: MonthRepository,
  ) {}

  async invoke(): Promise<BudgetSnapshot> {
    const [baseBudget, fixedExpenseItems, months] = await Promise.all([
      this.budgetRepository.findBase(),
      this.budgetRepository.findFixedExpenseItems(),
      this.monthRepository.findAll(),
    ]);
    return { baseBudget, fixedExpenseItems, months };
  }
}
