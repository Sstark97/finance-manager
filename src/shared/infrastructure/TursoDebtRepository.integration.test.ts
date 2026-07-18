import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TursoDebtRepository } from "@/shared/infrastructure/TursoDebtRepository";
import { TestDatabaseFactory, type TestDatabase } from "@/infrastructure/db/__fixtures__/TestDatabaseFactory";
import type { Debt } from "@/shared/domain/types";

describe("TursoDebtRepository", () => {
  let testDatabase: TestDatabase;
  let repository: TursoDebtRepository;

  beforeEach(async () => {
    testDatabase = await new TestDatabaseFactory().create();
    repository = new TursoDebtRepository(testDatabase.database);
    await testDatabase.seedUser("user-1");
    await testDatabase.seedUser("user-2");
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return an empty list when no debt has been saved yet", async () => {
    const debts = await repository.findAll("user-1");

    expect(debts).toEqual([]);
  });

  it("should round-trip a debt with a deadline through save and findAll", async () => {
    const appleWatchDebt: Debt = { id: "applewatch", name: "Apple Watch", installment: 75, balance: 105, note: "Liquidar antes de julio", deadline: "2026-07-10" };

    await repository.saveAll("user-1", [appleWatchDebt]);
    const debts = await repository.findAll("user-1");

    expect(debts).toEqual([appleWatchDebt]);
  });

  it("should round-trip a debt without a deadline as an undefined deadline", async () => {
    const kindleDebt: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre" };

    await repository.saveAll("user-1", [kindleDebt]);
    const [debt] = await repository.findAll("user-1");

    expect(debt.deadline).toBeUndefined();
  });

  it("should replace the previously saved debts when saveAll is called again for the same user", async () => {
    const kindleDebt: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre" };
    const carLoan: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };

    await repository.saveAll("user-1", [kindleDebt]);
    await repository.saveAll("user-1", [carLoan]);
    const debts = await repository.findAll("user-1");

    expect(debts).toEqual([carLoan]);
  });

  it("should keep debts isolated per user so one user never sees another user's debts", async () => {
    const kindleDebt: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre" };
    const carLoan: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };

    await repository.saveAll("user-1", [kindleDebt]);
    await repository.saveAll("user-2", [carLoan]);

    expect(await repository.findAll("user-1")).toEqual([kindleDebt]);
    expect(await repository.findAll("user-2")).toEqual([carLoan]);
  });

  it("should not delete another user's debts when saving the current user's debts", async () => {
    const kindleDebt: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre" };
    const carLoan: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };
    await repository.saveAll("user-1", [kindleDebt]);
    await repository.saveAll("user-2", [carLoan]);

    await repository.saveAll("user-1", []);

    expect(await repository.findAll("user-1")).toEqual([]);
    expect(await repository.findAll("user-2")).toEqual([carLoan]);
  });

  it("should round-trip a settled debt through save and findAll, keeping its settledAt and balance", async () => {
    const settledKindle: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquidada", settledAt: "2026-06-01" };

    await repository.saveAll("user-1", [settledKindle]);
    const debts = await repository.findAll("user-1");

    expect(debts).toEqual([settledKindle]);
  });

  it("should round-trip a mix of active and settled debts for the same user", async () => {
    const carLoan: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };
    const settledKindle: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquidada", settledAt: "2026-06-01" };

    await repository.saveAll("user-1", [carLoan, settledKindle]);
    const debts = await repository.findAll("user-1");

    expect(debts).toEqual(expect.arrayContaining([carLoan, settledKindle]));
    expect(debts).toHaveLength(2);
  });
});
