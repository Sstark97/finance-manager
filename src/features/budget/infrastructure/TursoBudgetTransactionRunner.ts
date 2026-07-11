import type { BudgetTransactionRunner, BudgetTransactionalRepositories } from "@/features/budget/application/BudgetTransactionRunner";
import type { Database } from "@/infrastructure/db/client";
import { TursoBudgetRepository } from "@/features/budget/infrastructure/TursoBudgetRepository";
import { TursoMonthRepository } from "@/features/budget/infrastructure/TursoMonthRepository";

export class TursoBudgetTransactionRunner implements BudgetTransactionRunner {
  constructor(private readonly database: Database) {}

  async runAtomically(work: (repositories: BudgetTransactionalRepositories) => Promise<void>): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await work({
        budgetRepository: new TursoBudgetRepository(transaction),
        monthRepository: new TursoMonthRepository(transaction),
      });
    });
  }
}
