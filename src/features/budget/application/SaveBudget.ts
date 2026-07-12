import type { Budget, FixedExpenseItem, Month } from "@/features/budget/domain/types";
import type { BudgetTransactionRunner } from "@/features/budget/application/BudgetTransactionRunner";

export interface BudgetSnapshotToSave {
  baseBudget: Budget;
  fixedExpenseItems: FixedExpenseItem[];
  months: Month[];
}

export interface SaveBudgetUseCase {
  invoke(userId: string, snapshot: BudgetSnapshotToSave): Promise<void>;
}

export class SaveBudget implements SaveBudgetUseCase {
  constructor(private readonly transactionRunner: BudgetTransactionRunner) {}

  async invoke(userId: string, snapshot: BudgetSnapshotToSave): Promise<void> {
    await this.transactionRunner.runAtomically(async ({ budgetRepository, monthRepository }) => {
      await budgetRepository.saveBase(userId, snapshot.baseBudget);
      await budgetRepository.saveFixedExpenseItems(userId, snapshot.fixedExpenseItems);
      await monthRepository.saveAll(userId, snapshot.months);
    });
  }
}
