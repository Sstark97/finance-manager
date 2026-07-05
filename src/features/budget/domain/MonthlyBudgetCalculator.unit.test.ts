import { describe, expect, it } from "vitest";
import { MonthlyBudgetCalculator } from "@/features/budget/domain/MonthlyBudgetCalculator";
import type { Month, Budget } from "@/features/budget/domain/types";

describe("MonthlyBudgetCalculator", () => {
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

  it("should use the month override for a category instead of the base value", () => {
    const month = buildMonth({ overrides: { inversion: 450 } });

    const result = new MonthlyBudgetCalculator().calculate(month, base);

    expect(result.values.inversion).toBe(450);
    expect(result.values.ocio).toBe(base.ocio);
  });

  it("should add up events that belong to a category on top of its target", () => {
    const month = buildMonth({
      events: [
        { id: "e1", name: "Regalo", amount: 40, category: "ocio" },
        { id: "e2", name: "Cine", amount: 15, category: "ocio" },
      ],
    });

    const result = new MonthlyBudgetCalculator().calculate(month, base);

    expect(result.values.ocio).toBe(base.ocio + 40 + 15);
  });

  it("should add netIncomeOverride and ingreso events into the income for the month", () => {
    const month = buildMonth({
      netIncomeOverride: 2000,
      events: [{ id: "e1", name: "Extra", amount: 100, category: "ingreso" }],
    });

    const result = new MonthlyBudgetCalculator().calculate(month, base);

    expect(result.income).toBe(2000 + 100);
  });

  it("should compute surplus as income minus totalBudgeted", () => {
    const month = buildMonth();

    const result = new MonthlyBudgetCalculator().calculate(month, base);
    const expectedTotalBudgeted = base.gastosFijos + base.inversion + base.fondoEmergencia + base.ocio + base.caprichos;

    expect(result.totalBudgeted).toBe(expectedTotalBudgeted);
    expect(result.surplus).toBe(base.ingresoNeto - expectedTotalBudgeted);
  });

  it("should use the actual value for totalActual when a category has been registered", () => {
    const month = buildMonth({ actual: { ocio: 250 } });

    const result = new MonthlyBudgetCalculator().calculate(month, base);
    const totalWithoutOcio = base.gastosFijos + base.inversion + base.fondoEmergencia + base.caprichos;

    expect(result.totalActual).toBe(totalWithoutOcio + 250);
  });

  it("should fall back to the budgeted value for totalActual when actual is null", () => {
    const month = buildMonth({ actual: { ocio: null } });

    const result = new MonthlyBudgetCalculator().calculate(month, base);
    const expectedTotalBudgeted = base.gastosFijos + base.inversion + base.fondoEmergencia + base.ocio + base.caprichos;

    expect(result.totalActual).toBe(expectedTotalBudgeted);
  });
});
