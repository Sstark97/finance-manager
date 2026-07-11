import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TursoBudgetRepository } from "@/features/budget/infrastructure/TursoBudgetRepository";
import { TestDatabaseFactory, type TestDatabase } from "@/infrastructure/db/__fixtures__/TestDatabaseFactory";
import type { Budget, FixedExpenseItem } from "@/features/budget/domain/types";

describe("TursoBudgetRepository", () => {
  let testDatabase: TestDatabase;
  let repository: TursoBudgetRepository;

  beforeEach(async () => {
    testDatabase = await new TestDatabaseFactory().create();
    repository = new TursoBudgetRepository(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return null when the base budget singleton has not been seeded yet", async () => {
    await expect(repository.findBase()).resolves.toBeNull();
  });

  it("should round-trip the base budget singleton through saveBase and findBase", async () => {
    const baseBudget: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };

    await repository.saveBase(baseBudget);
    const storedBudget = await repository.findBase();

    expect(storedBudget).toEqual(baseBudget);
  });

  it("should overwrite the existing base budget singleton on a second saveBase call", async () => {
    const initialBudget: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };
    const revisedBudget: Budget = { ...initialBudget, inversion: 350 };

    await repository.saveBase(initialBudget);
    await repository.saveBase(revisedBudget);
    const storedBudget = await repository.findBase();

    expect(storedBudget).toEqual(revisedBudget);
  });

  it("should round-trip fixed expense items preserving their given order", async () => {
    const items: FixedExpenseItem[] = [
      { id: "coche", name: "Coche (financiación)", amount: 173.28 },
      { id: "otros", name: "Suministros y seguros", amount: 605.61 },
    ];

    await repository.saveFixedExpenseItems(items);
    const storedItems = await repository.findFixedExpenseItems();

    expect(storedItems).toEqual(items);
  });

  it("should replace the previously saved fixed expense items when saveFixedExpenseItems is called again", async () => {
    await repository.saveFixedExpenseItems([{ id: "coche", name: "Coche", amount: 173.28 }]);
    await repository.saveFixedExpenseItems([{ id: "alquiler", name: "Alquiler", amount: 600 }]);

    const storedItems = await repository.findFixedExpenseItems();

    expect(storedItems).toEqual([{ id: "alquiler", name: "Alquiler", amount: 600 }]);
  });
});
