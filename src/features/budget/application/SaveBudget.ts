import type { BudgetSnapshot } from "@/features/budget/application/BudgetSnapshot";
import type { BudgetTransactionRunner } from "@/features/budget/application/BudgetTransactionRunner";

export interface SaveBudgetUseCase {
  invoke(snapshot: BudgetSnapshot): Promise<void>;
}

export class SaveBudget implements SaveBudgetUseCase {
  constructor(private readonly transactionRunner: BudgetTransactionRunner) {}

  async invoke(snapshot: BudgetSnapshot): Promise<void> {
    await this.transactionRunner.runAtomically(async ({ budgetRepository, monthRepository }) => {
      await budgetRepository.saveBase(snapshot.baseBudget);
      await budgetRepository.saveFixedExpenseItems(snapshot.fixedExpenseItems);
      await monthRepository.saveAll(snapshot.months);
    });
  }
}
