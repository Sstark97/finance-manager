import { describe, expect, it } from "vitest";
import { SaveBudget } from "@/features/budget/application/SaveBudget";
import type { BudgetRepository } from "@/features/budget/application/BudgetRepository";
import type { MonthRepository } from "@/features/budget/application/MonthRepository";
import type { BudgetTransactionRunner, BudgetTransactionalRepositories } from "@/features/budget/application/BudgetTransactionRunner";
import type { Budget, FixedExpenseItem, Month } from "@/features/budget/domain/types";

class RecordingBudgetRepository implements BudgetRepository {
  savedBase: Budget | null = null;
  savedItems: FixedExpenseItem[] | null = null;

  async findBase(): Promise<Budget> {
    throw new Error("not used in this test");
  }

  async saveBase(budget: Budget): Promise<void> {
    this.savedBase = budget;
  }

  async findFixedExpenseItems(): Promise<FixedExpenseItem[]> {
    throw new Error("not used in this test");
  }

  async saveFixedExpenseItems(items: FixedExpenseItem[]): Promise<void> {
    this.savedItems = items;
  }
}

class RecordingMonthRepository implements MonthRepository {
  savedMonths: Month[] | null = null;

  async findAll(): Promise<Month[]> {
    throw new Error("not used in this test");
  }

  async saveAll(months: Month[]): Promise<void> {
    this.savedMonths = months;
  }
}

class StubBudgetTransactionRunner implements BudgetTransactionRunner {
  constructor(private readonly repositories: BudgetTransactionalRepositories) {}

  async runAtomically(work: (repositories: BudgetTransactionalRepositories) => Promise<void>): Promise<void> {
    await work(this.repositories);
  }
}

describe("SaveBudget", () => {
  it("should persist the base budget, fixed expense items and months through their repositories", async () => {
    const budgetRepository = new RecordingBudgetRepository();
    const monthRepository = new RecordingMonthRepository();
    const useCase = new SaveBudget(new StubBudgetTransactionRunner({ budgetRepository, monthRepository }));
    const baseBudget: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };
    const fixedExpenseItems: FixedExpenseItem[] = [{ id: "coche", name: "Coche", amount: 173.28 }];
    const months: Month[] = [{ id: "month-1", date: new Date("2026-06-01"), label: "jun 26", overrides: {}, actual: {}, events: [], netIncomeOverride: null }];

    await useCase.invoke({ baseBudget, fixedExpenseItems, months });

    expect(budgetRepository.savedBase).toEqual(baseBudget);
    expect(budgetRepository.savedItems).toEqual(fixedExpenseItems);
    expect(monthRepository.savedMonths).toEqual(months);
  });
});
