import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TursoBudgetTransactionRunner } from "@/features/budget/infrastructure/TursoBudgetTransactionRunner";
import { TursoBudgetRepository } from "@/features/budget/infrastructure/TursoBudgetRepository";
import { TursoMonthRepository } from "@/features/budget/infrastructure/TursoMonthRepository";
import { TestDatabaseFactory, type TestDatabase } from "@/infrastructure/db/__fixtures__/TestDatabaseFactory";
import type { Budget, FixedExpenseItem, Month } from "@/features/budget/domain/types";

describe("TursoBudgetTransactionRunner", () => {
  let testDatabase: TestDatabase;
  let runner: TursoBudgetTransactionRunner;
  let readBudgetRepository: TursoBudgetRepository;
  let readMonthRepository: TursoMonthRepository;

  const initialBudget: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };
  const initialItems: FixedExpenseItem[] = [{ id: "coche", name: "Coche", amount: 173.28 }];
  const initialMonths: Month[] = [{ id: "month-1", date: new Date("2026-06-01"), label: "jun 26", overrides: {}, actual: {}, events: [], netIncomeOverride: null }];

  beforeEach(async () => {
    testDatabase = await new TestDatabaseFactory().create();
    runner = new TursoBudgetTransactionRunner(testDatabase.database);
    readBudgetRepository = new TursoBudgetRepository(testDatabase.database);
    readMonthRepository = new TursoMonthRepository(testDatabase.database);

    await runner.runAtomically(async ({ budgetRepository, monthRepository }) => {
      await budgetRepository.saveBase(initialBudget);
      await budgetRepository.saveFixedExpenseItems(initialItems);
      await monthRepository.saveAll(initialMonths);
    });
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should commit writes across both repositories when the whole callback succeeds", async () => {
    const revisedBudget: Budget = { ...initialBudget, inversion: 350 };
    const revisedMonths: Month[] = [{ ...initialMonths[0], netIncomeOverride: 1800 }];

    await runner.runAtomically(async ({ budgetRepository, monthRepository }) => {
      await budgetRepository.saveBase(revisedBudget);
      await monthRepository.saveAll(revisedMonths);
    });

    expect(await readBudgetRepository.findBase()).toEqual(revisedBudget);
    expect(await readMonthRepository.findAll()).toEqual(revisedMonths);
  });

  it("should roll back every write made inside the callback when a later step throws", async () => {
    const revisedBudget: Budget = { ...initialBudget, inversion: 999 };

    await expect(
      runner.runAtomically(async ({ budgetRepository, monthRepository }) => {
        await budgetRepository.saveBase(revisedBudget);
        await monthRepository.saveAll([]);
        throw new Error("simulated failure after two of three writes succeeded");
      }),
    ).rejects.toThrow("simulated failure");

    expect(await readBudgetRepository.findBase()).toEqual(initialBudget);
    expect(await readMonthRepository.findAll()).toEqual(initialMonths);
  });
});
