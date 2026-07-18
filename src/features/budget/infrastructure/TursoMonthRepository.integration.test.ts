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
    await testDatabase.seedUser("user-1");
    await testDatabase.seedUser("user-2");
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return an empty list when no month has been saved yet", async () => {
    const months = await repository.findAll("user-1");

    expect(months).toEqual([]);
  });

  it("should round-trip a month with sparse overrides, movements and events", async () => {
    const june: Month = {
      id: "june", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26",
      overrides: { inversion: 225, fondoEmergencia: 203 },
      movements: [{ id: "movement-1", categoryId: "inversion", occurredAt: new Date("2026-06-05T00:00:00.000Z"), amount: 230, note: "Aportación mensual" }],
      events: [{ id: "event-1", name: "Liquidar Apple Watch", amount: 188.53, category: "gastosFijos" }],
      netIncomeOverride: null,
    };

    await repository.saveAll("user-1", [june]);
    const months = await repository.findAll("user-1");

    expect(months).toEqual([june]);
  });

  it("should return months ordered chronologically by date regardless of save order", async () => {
    const july: Month = { id: "july", date: new Date("2026-07-01T00:00:00.000Z"), label: "jul 26", overrides: {}, movements: [], events: [], netIncomeOverride: null };
    const june: Month = { id: "june", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26", overrides: {}, movements: [], events: [], netIncomeOverride: null };

    await repository.saveAll("user-1", [july, june]);
    const months = await repository.findAll("user-1");

    expect(months.map((month) => month.id)).toEqual(["june", "july"]);
  });

  it("should replace previously saved months, categories, movements and events when saveAll is called again for the same user", async () => {
    const june: Month = {
      id: "june", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26",
      overrides: { inversion: 225 }, movements: [{ id: "movement-1", categoryId: "inversion", occurredAt: new Date("2026-06-05T00:00:00.000Z"), amount: 225, note: "" }],
      events: [{ id: "event-1", name: "Liquidar Apple Watch", amount: 188.53, category: "gastosFijos" }],
      netIncomeOverride: null,
    };
    const july: Month = { id: "july", date: new Date("2026-07-01T00:00:00.000Z"), label: "jul 26", overrides: {}, movements: [], events: [], netIncomeOverride: null };

    await repository.saveAll("user-1", [june]);
    await repository.saveAll("user-1", [july]);
    const months = await repository.findAll("user-1");

    expect(months).toEqual([july]);
  });

  it("should preserve a net income override of zero without collapsing it to the base income", async () => {
    const june: Month = { id: "june", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26", overrides: {}, movements: [], events: [], netIncomeOverride: 0 };

    await repository.saveAll("user-1", [june]);
    const [storedMonth] = await repository.findAll("user-1");

    expect(storedMonth.netIncomeOverride).toBe(0);
  });

  it("should keep months, categories, movements and events isolated per user", async () => {
    const firstUserMonth: Month = {
      id: "june", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26",
      overrides: { inversion: 225 }, movements: [{ id: "movement-1", categoryId: "inversion", occurredAt: new Date("2026-06-05T00:00:00.000Z"), amount: 225, note: "" }],
      events: [{ id: "event-1", name: "Apple Watch", amount: 75, category: "gastosFijos" }],
      netIncomeOverride: null,
    };
    const secondUserMonth: Month = { id: "july", date: new Date("2026-07-01T00:00:00.000Z"), label: "jul 26", overrides: {}, movements: [], events: [], netIncomeOverride: null };

    await repository.saveAll("user-1", [firstUserMonth]);
    await repository.saveAll("user-2", [secondUserMonth]);

    expect(await repository.findAll("user-1")).toEqual([firstUserMonth]);
    expect(await repository.findAll("user-2")).toEqual([secondUserMonth]);
  });

  it("should not delete another user's months when saving the current user's months", async () => {
    const firstUserMonth: Month = { id: "june", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26", overrides: {}, movements: [], events: [], netIncomeOverride: null };
    const secondUserMonth: Month = { id: "july", date: new Date("2026-07-01T00:00:00.000Z"), label: "jul 26", overrides: {}, movements: [], events: [], netIncomeOverride: null };
    await repository.saveAll("user-1", [firstUserMonth]);
    await repository.saveAll("user-2", [secondUserMonth]);

    await repository.saveAll("user-1", []);

    expect(await repository.findAll("user-1")).toEqual([]);
    expect(await repository.findAll("user-2")).toEqual([secondUserMonth]);
  });
});
