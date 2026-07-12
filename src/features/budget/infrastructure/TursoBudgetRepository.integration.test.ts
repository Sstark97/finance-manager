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
    await testDatabase.seedUser("user-1");
    await testDatabase.seedUser("user-2");
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return null when the base budget has not been seeded yet for the user", async () => {
    await expect(repository.findBase("user-1")).resolves.toBeNull();
  });

  it("should round-trip the base budget through saveBase and findBase", async () => {
    const baseBudget: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };

    await repository.saveBase("user-1", baseBudget);
    const storedBudget = await repository.findBase("user-1");

    expect(storedBudget).toEqual(baseBudget);
  });

  it("should overwrite the existing base budget on a second saveBase call for the same user", async () => {
    const initialBudget: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };
    const revisedBudget: Budget = { ...initialBudget, inversion: 350 };

    await repository.saveBase("user-1", initialBudget);
    await repository.saveBase("user-1", revisedBudget);
    const storedBudget = await repository.findBase("user-1");

    expect(storedBudget).toEqual(revisedBudget);
  });

  it("should round-trip fixed expense items preserving their given order", async () => {
    const items: FixedExpenseItem[] = [
      { id: "coche", name: "Coche (financiación)", amount: 173.28 },
      { id: "otros", name: "Suministros y seguros", amount: 605.61 },
    ];

    await repository.saveFixedExpenseItems("user-1", items);
    const storedItems = await repository.findFixedExpenseItems("user-1");

    expect(storedItems).toEqual(items);
  });

  it("should replace the previously saved fixed expense items when saveFixedExpenseItems is called again for the same user", async () => {
    await repository.saveFixedExpenseItems("user-1", [{ id: "coche", name: "Coche", amount: 173.28 }]);
    await repository.saveFixedExpenseItems("user-1", [{ id: "alquiler", name: "Alquiler", amount: 600 }]);

    const storedItems = await repository.findFixedExpenseItems("user-1");

    expect(storedItems).toEqual([{ id: "alquiler", name: "Alquiler", amount: 600 }]);
  });

  it("should keep the base budget and fixed expense items isolated per user", async () => {
    const firstUserBudget: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };
    const secondUserBudget: Budget = { ingresoNeto: 2500, gastosFijos: 900, inversion: 400, fondoEmergencia: 200, ocio: 150, caprichos: 80 };
    const firstUserItems: FixedExpenseItem[] = [{ id: "coche", name: "Coche", amount: 173.28 }];
    const secondUserItems: FixedExpenseItem[] = [{ id: "alquiler", name: "Alquiler", amount: 600 }];

    await repository.saveBase("user-1", firstUserBudget);
    await repository.saveBase("user-2", secondUserBudget);
    await repository.saveFixedExpenseItems("user-1", firstUserItems);
    await repository.saveFixedExpenseItems("user-2", secondUserItems);

    expect(await repository.findBase("user-1")).toEqual(firstUserBudget);
    expect(await repository.findBase("user-2")).toEqual(secondUserBudget);
    expect(await repository.findFixedExpenseItems("user-1")).toEqual(firstUserItems);
    expect(await repository.findFixedExpenseItems("user-2")).toEqual(secondUserItems);
  });
});
