import { describe, expect, it } from "vitest";
import { MonthRowMapper } from "@/features/budget/infrastructure/MonthRowMapper";
import type { Month } from "@/features/budget/domain/types";

describe("MonthRowMapper", () => {
  const mapper = new MonthRowMapper();
  const monthRow = { id: "month-1", userId: "user-1", date: new Date("2026-06-01T00:00:00.000Z").getTime(), label: "jun 26", netIncomeOverride: null };

  it("should reconstruct a month with no overrides, movements or events from empty child rows", () => {
    const month = mapper.toDomain(monthRow, [], []);

    expect(month).toEqual<Month>({
      id: "month-1", date: new Date(monthRow.date), label: "jun 26",
      overrides: {}, movements: [], events: [], netIncomeOverride: null,
    });
  });

  it("should reconstruct sparse overrides from their category rows", () => {
    const categoryRows = [
      { monthId: "month-1", categoryId: "inversion", overrideAmount: 225 },
      { monthId: "month-1", categoryId: "fondoEmergencia", overrideAmount: null },
    ];

    const month = mapper.toDomain(monthRow, categoryRows, []);

    expect(month.overrides).toEqual({ inversion: 225 });
  });

  it("should reconstruct the events belonging to the month", () => {
    const eventRows = [{ id: "event-1", monthId: "month-1", name: "Kindle 2/3", amount: 83.05, category: "gastosFijos" }];

    const month = mapper.toDomain(monthRow, [], eventRows);

    expect(month.events).toEqual([{ id: "event-1", name: "Kindle 2/3", amount: 83.05, category: "gastosFijos" }]);
  });

  it("should reconstruct the movements belonging to the month", () => {
    const movementRows = [
      { id: "movement-1", monthId: "month-1", categoryId: "ocio", occurredAt: new Date("2026-06-10T00:00:00.000Z").getTime(), amount: 42.5, note: "Cine" },
    ];

    const month = mapper.toDomain(monthRow, [], [], movementRows);

    expect(month.movements).toEqual([
      { id: "movement-1", categoryId: "ocio", occurredAt: new Date("2026-06-10T00:00:00.000Z"), amount: 42.5, note: "Cine" },
    ]);
  });

  it("should only emit category rows for categories that have an override", () => {
    const month: Month = {
      id: "month-1", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26",
      overrides: { inversion: 225 }, movements: [], events: [], netIncomeOverride: null,
    };

    const categoryRows = mapper.toCategoryRows(month);

    expect(categoryRows).toEqual([{ monthId: "month-1", categoryId: "inversion", overrideAmount: 225 }]);
  });

  it("should map a month back into a row carrying the owning user", () => {
    const month: Month = {
      id: "month-1", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26",
      overrides: {}, movements: [], events: [], netIncomeOverride: null,
    };

    const row = mapper.toMonthRow(month, "user-1");

    expect(row).toEqual({ id: "month-1", userId: "user-1", date: month.date.getTime(), label: "jun 26", netIncomeOverride: null });
  });

  it("should map the movements of a month back into rows carrying the owning month", () => {
    const month: Month = {
      id: "month-1", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26",
      overrides: {}, events: [],
      movements: [{ id: "movement-1", categoryId: "ocio", occurredAt: new Date("2026-06-10T00:00:00.000Z"), amount: 42.5, note: "Cine" }],
      netIncomeOverride: null,
    };

    const movementRows = mapper.toMovementRows(month);

    expect(movementRows).toEqual([
      { id: "movement-1", monthId: "month-1", categoryId: "ocio", occurredAt: new Date("2026-06-10T00:00:00.000Z").getTime(), amount: 42.5, note: "Cine" },
    ]);
  });
});
