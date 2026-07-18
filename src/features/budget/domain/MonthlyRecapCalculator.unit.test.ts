import { describe, expect, it } from "vitest";
import { MonthlyRecapCalculator } from "@/features/budget/domain/MonthlyRecapCalculator";
import type { Month, Budget } from "@/features/budget/domain/types";

const base: Budget = {
  ingresoNeto: 1800,
  gastosFijos: 700,
  inversion: 300,
  fondoEmergencia: 300,
  ocio: 300,
  caprichos: 200,
};

const buildMonth = (overrides: Partial<Month> = {}): Month => ({
  id: "mes-test",
  date: new Date(2026, 0, 1),
  label: "ene 26",
  overrides: {},
  events: [],
  actual: {},
  netIncomeOverride: null,
  ...overrides,
});

const calculator = new MonthlyRecapCalculator();

describe("MonthlyRecapCalculator", () => {
  it("should flag a gasto category as overspent when its realized amount exceeds the plan", () => {
    const month = buildMonth({ id: "julio", actual: { ocio: 450 } });

    const recap = calculator.calculate(month, [month], base);

    expect(recap.overspentCategories).toEqual([
      { categoryId: "ocio", categoryName: "Ocio", budgeted: base.ocio, realized: 450, overspentBy: 150 },
    ]);
  });

  it("should flag an ahorro category as overspent when its realized amount falls short of the plan", () => {
    const month = buildMonth({ id: "julio", actual: { inversion: 100 } });

    const recap = calculator.calculate(month, [month], base);

    expect(recap.overspentCategories).toEqual([
      { categoryId: "inversion", categoryName: "Inversión", budgeted: base.inversion, realized: 100, overspentBy: 200 },
    ]);
  });

  it("should not flag a category that has not been registered yet", () => {
    const month = buildMonth({ id: "julio" });

    const recap = calculator.calculate(month, [month], base);

    expect(recap.overspentCategories).toEqual([]);
  });

  it("should not flag a category that stays within its plan", () => {
    const month = buildMonth({ id: "julio", actual: { ocio: 200 } });

    const recap = calculator.calculate(month, [month], base);

    expect(recap.overspentCategories).toEqual([]);
  });

  it("should report no previous month when the given month is the earliest one registered", () => {
    const january = buildMonth({ id: "enero", date: new Date(2026, 0, 1) });
    const february = buildMonth({ id: "febrero", date: new Date(2026, 1, 1) });

    const recap = calculator.calculate(january, [january, february], base);

    expect(recap.previousMonth).toBeNull();
    expect(recap.surplusDeltaVsPreviousMonth).toBeNull();
  });

  it("should compare against the chronologically previous month regardless of array order", () => {
    const january = buildMonth({ id: "enero", date: new Date(2026, 0, 1), actual: { ocio: 200 } });
    const february = buildMonth({ id: "febrero", date: new Date(2026, 1, 1), actual: { ocio: 250 } });

    const recap = calculator.calculate(february, [february, january], base);

    expect(recap.previousMonth?.id).toBe("enero");
  });

  it("should compute the surplus, income and total actual deltas against the previous month", () => {
    const january = buildMonth({ id: "enero", date: new Date(2026, 0, 1), netIncomeOverride: 1800 });
    const february = buildMonth({ id: "febrero", date: new Date(2026, 1, 1), netIncomeOverride: 2000, actual: { ocio: 400 } });

    const recap = calculator.calculate(february, [january, february], base);

    expect(recap.incomeDeltaVsPreviousMonth).toBe(200);
    expect(recap.totalActualDeltaVsPreviousMonth).toBe(recap.result.totalActual - (recap.previousResult?.totalActual ?? 0));
    expect(recap.surplusDeltaVsPreviousMonth).toBe(recap.result.surplus - (recap.previousResult?.surplus ?? 0));
  });
});
