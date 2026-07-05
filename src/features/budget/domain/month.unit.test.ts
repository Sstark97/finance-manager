import { describe, expect, it } from "vitest";
import { monthKey, createMonth, isMonthAvailable } from "@/features/budget/domain/month";

describe("isMonthAvailable", () => {
  it("should consider a past month available", () => {
    const pastMonth = new Date();
    pastMonth.setMonth(pastMonth.getMonth() - 1);

    expect(isMonthAvailable(pastMonth)).toBe(true);
  });

  it("should consider the current month available", () => {
    expect(isMonthAvailable(new Date())).toBe(true);
  });

  it("should consider a future month not available", () => {
    const futureMonth = new Date();
    futureMonth.setMonth(futureMonth.getMonth() + 1);

    expect(isMonthAvailable(futureMonth)).toBe(false);
  });
});

describe("monthKey", () => {
  it("should increase monotonically from one month to the next", () => {
    const january2026 = monthKey(new Date(2026, 0, 1));
    const february2026 = monthKey(new Date(2026, 1, 1));
    const january2027 = monthKey(new Date(2027, 0, 1));

    expect(february2026).toBeGreaterThan(january2026);
    expect(january2027).toBeGreaterThan(february2026);
  });
});

describe("createMonth", () => {
  it("should produce the date and label matching the given year and month index", () => {
    const month = createMonth(2026, 6);

    expect(month.date).toEqual(new Date(2026, 6, 1));
    expect(month.label).toBe(new Date(2026, 6, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).replace(".", ""));
  });

  it("should default overrides, events, actual and netIncomeOverride to empty state", () => {
    const month = createMonth(2026, 6);

    expect(month.overrides).toEqual({});
    expect(month.events).toEqual([]);
    expect(month.actual).toEqual({});
    expect(month.netIncomeOverride).toBeNull();
  });

  it("should keep the given overrides and events", () => {
    const events = [{ id: "e1", name: "Extra", amount: 50, category: "ingreso" as const }];

    const month = createMonth(2026, 6, { inversion: 250 }, events);

    expect(month.overrides).toEqual({ inversion: 250 });
    expect(month.events).toEqual(events);
  });
});
