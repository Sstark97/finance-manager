import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TursoMonthRepository } from "@/features/budget/infrastructure/TursoMonthRepository";
import { TestDatabaseFactory, type TestDatabase } from "@/infrastructure/db/__fixtures__/TestDatabaseFactory";
import type { Month } from "@/features/budget/domain/types";

describe("TursoMonthRepository", () => {
  let testDatabase: TestDatabase;
  let repository: TursoMonthRepository;

  beforeEach(async () => {
    testDatabase = await new TestDatabaseFactory().create();
    repository = new TursoMonthRepository(testDatabase.database);
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return an empty list when no month has been saved yet", async () => {
    const months = await repository.findAll();

    expect(months).toEqual([]);
  });

  it("should round-trip a month with sparse overrides, actuals and events", async () => {
    const june: Month = {
      id: "june", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26",
      overrides: { inversion: 225, fondoEmergencia: 203 },
      actual: { inversion: 230 },
      events: [{ id: "event-1", name: "Liquidar Apple Watch", amount: 188.53, category: "gastosFijos" }],
      netIncomeOverride: null,
    };

    await repository.saveAll([june]);
    const months = await repository.findAll();

    expect(months).toEqual([june]);
  });

  it("should return months ordered chronologically by date regardless of save order", async () => {
    const july: Month = { id: "july", date: new Date("2026-07-01T00:00:00.000Z"), label: "jul 26", overrides: {}, actual: {}, events: [], netIncomeOverride: null };
    const june: Month = { id: "june", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26", overrides: {}, actual: {}, events: [], netIncomeOverride: null };

    await repository.saveAll([july, june]);
    const months = await repository.findAll();

    expect(months.map((month) => month.id)).toEqual(["june", "july"]);
  });

  it("should replace previously saved months, categories and events when saveAll is called again", async () => {
    const june: Month = {
      id: "june", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26",
      overrides: { inversion: 225 }, actual: {},
      events: [{ id: "event-1", name: "Liquidar Apple Watch", amount: 188.53, category: "gastosFijos" }],
      netIncomeOverride: null,
    };
    const july: Month = { id: "july", date: new Date("2026-07-01T00:00:00.000Z"), label: "jul 26", overrides: {}, actual: {}, events: [], netIncomeOverride: null };

    await repository.saveAll([june]);
    await repository.saveAll([july]);
    const months = await repository.findAll();

    expect(months).toEqual([july]);
  });

  it("should preserve a net income override of zero without collapsing it to the base income", async () => {
    const june: Month = { id: "june", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26", overrides: {}, actual: {}, events: [], netIncomeOverride: 0 };

    await repository.saveAll([june]);
    const [storedMonth] = await repository.findAll();

    expect(storedMonth.netIncomeOverride).toBe(0);
  });
});
