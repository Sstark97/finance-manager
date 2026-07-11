import { describe, expect, it } from "vitest";
import { MonthRowMapper } from "@/features/budget/infrastructure/MonthRowMapper";
import type { Month } from "@/features/budget/domain/types";

describe("MonthRowMapper", () => {
  const mapper = new MonthRowMapper();
  const monthRow = { id: "month-1", date: new Date("2026-06-01T00:00:00.000Z").getTime(), label: "jun 26", netIncomeOverride: null };

  it("should reconstruct a month with no overrides, actuals or events from empty child rows", () => {
    const month = mapper.toDomain(monthRow, [], []);

    expect(month).toEqual<Month>({
      id: "month-1", date: new Date(monthRow.date), label: "jun 26",
      overrides: {}, actual: {}, events: [], netIncomeOverride: null,
    });
  });

  it("should reconstruct sparse overrides and actuals from their respective category rows", () => {
    const categoryRows = [
      { monthId: "month-1", categoryId: "inversion", overrideAmount: 225, actualAmount: null },
      { monthId: "month-1", categoryId: "fondoEmergencia", overrideAmount: null, actualAmount: 199 },
    ];

    const month = mapper.toDomain(monthRow, categoryRows, []);

    expect(month.overrides).toEqual({ inversion: 225 });
    expect(month.actual).toEqual({ fondoEmergencia: 199 });
  });

  it("should reconstruct the events belonging to the month", () => {
    const eventRows = [{ id: "event-1", monthId: "month-1", name: "Kindle 2/3", amount: 83.05, category: "gastosFijos" }];

    const month = mapper.toDomain(monthRow, [], eventRows);

    expect(month.events).toEqual([{ id: "event-1", name: "Kindle 2/3", amount: 83.05, category: "gastosFijos" }]);
  });

  it("should only emit category rows for categories that have an override or a registered actual", () => {
    const month: Month = {
      id: "month-1", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26",
      overrides: { inversion: 225 }, actual: { fondoEmergencia: 199 }, events: [], netIncomeOverride: null,
    };

    const categoryRows = mapper.toCategoryRows(month);

    expect(categoryRows).toEqual(expect.arrayContaining([
      { monthId: "month-1", categoryId: "inversion", overrideAmount: 225, actualAmount: null },
      { monthId: "month-1", categoryId: "fondoEmergencia", overrideAmount: null, actualAmount: 199 },
    ]));
    expect(categoryRows).toHaveLength(2);
  });

  it("should combine an override and an actual for the same category into a single row", () => {
    const month: Month = {
      id: "month-1", date: new Date("2026-06-01T00:00:00.000Z"), label: "jun 26",
      overrides: { inversion: 225 }, actual: { inversion: 230 }, events: [], netIncomeOverride: null,
    };

    const categoryRows = mapper.toCategoryRows(month);

    expect(categoryRows).toEqual([{ monthId: "month-1", categoryId: "inversion", overrideAmount: 225, actualAmount: 230 }]);
  });
});
