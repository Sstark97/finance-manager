import type { BudgetRepository } from "@/features/budget/application/BudgetRepository";
import type { MonthRepository } from "@/features/budget/application/MonthRepository";

export interface BudgetTransactionalRepositories {
  budgetRepository: BudgetRepository;
  monthRepository: MonthRepository;
}

export interface BudgetTransactionRunner {
  runAtomically(work: (repositories: BudgetTransactionalRepositories) => Promise<void>): Promise<void>;
}
