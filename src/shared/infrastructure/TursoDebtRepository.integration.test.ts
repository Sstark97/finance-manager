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
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return an empty list when no debt has been saved yet", async () => {
    const debts = await repository.findAll();

    expect(debts).toEqual([]);
  });

  it("should round-trip a debt with a deadline through save and findAll", async () => {
    const appleWatchDebt: Debt = { id: "applewatch", name: "Apple Watch", installment: 75, balance: 105, note: "Liquidar antes de julio", deadline: "2026-07-10" };

    await repository.saveAll([appleWatchDebt]);
    const debts = await repository.findAll();

    expect(debts).toEqual([appleWatchDebt]);
  });

  it("should round-trip a debt without a deadline as an undefined deadline", async () => {
    const kindleDebt: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre" };

    await repository.saveAll([kindleDebt]);
    const [debt] = await repository.findAll();

    expect(debt.deadline).toBeUndefined();
  });

  it("should replace the previously saved debts when saveAll is called again", async () => {
    const kindleDebt: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre" };
    const carLoan: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };

    await repository.saveAll([kindleDebt]);
    await repository.saveAll([carLoan]);
    const debts = await repository.findAll();

    expect(debts).toEqual([carLoan]);
  });
});
