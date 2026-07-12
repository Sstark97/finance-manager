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

  it("should keep values reflecting only the plan, unaffected by events", () => {
    const month = buildMonth({
      events: [
        { id: "e1", name: "Regalo", amount: 40, category: "ocio" },
        { id: "e2", name: "Cine", amount: 15, category: "ocio" },
      ],
    });

    const result = new MonthlyBudgetCalculator().calculate(month, base);

    expect(result.values.ocio).toBe(base.ocio);
  });

  it("should add events on top of the plan into realized when there is no manual actual", () => {
    const month = buildMonth({
      events: [
        { id: "e1", name: "Regalo", amount: 40, category: "ocio" },
        { id: "e2", name: "Cine", amount: 15, category: "ocio" },
      ],
    });

    const result = new MonthlyBudgetCalculator().calculate(month, base);

    expect(result.realized.ocio).toBe(base.ocio + 40 + 15);
  });

  it("should leave realized as null for a category with no manual actual and no events", () => {
    const month = buildMonth();

    const result = new MonthlyBudgetCalculator().calculate(month, base);

    expect(result.realized.ocio).toBeNull();
  });

  it("should combine the manual actual with events into realized", () => {
    const month = buildMonth({
      actual: { ocio: 250 },
      events: [{ id: "e1", name: "Cine", amount: 15, category: "ocio" }],
    });

    const result = new MonthlyBudgetCalculator().calculate(month, base);

    expect(result.realized.ocio).toBe(250 + 15);
  });

  it("should use the manual actual alone for realized when there are no events", () => {
    const month = buildMonth({ actual: { ocio: 250 } });

    const result = new MonthlyBudgetCalculator().calculate(month, base);

    expect(result.realized.ocio).toBe(250);
  });

  it("should add netIncomeOverride and ingreso events into the income for the month", () => {
    const month = buildMonth({
      netIncomeOverride: 2000,
      events: [{ id: "e1", name: "Extra", amount: 100, category: "ingreso" }],
    });

    const result = new MonthlyBudgetCalculator().calculate(month, base);

    expect(result.income).toBe(2000 + 100);
  });

  it("should compute surplus as income minus totalBudgeted when nothing has been realized yet", () => {
    const month = buildMonth();

    const result = new MonthlyBudgetCalculator().calculate(month, base);
    const expectedTotalBudgeted = base.gastosFijos + base.inversion + base.fondoEmergencia + base.ocio + base.caprichos;

    expect(result.totalBudgeted).toBe(expectedTotalBudgeted);
    expect(result.surplus).toBe(base.ingresoNeto - expectedTotalBudgeted);
  });

  it("should compute surplus as income minus totalActual, reflecting real spending events over the plan", () => {
    const month = buildMonth({
      events: [{ id: "e1", name: "Deuda puntual", amount: 500, category: "gastosFijos" }],
    });

    const result = new MonthlyBudgetCalculator().calculate(month, base);
    const expectedTotalBudgeted = base.gastosFijos + base.inversion + base.fondoEmergencia + base.ocio + base.caprichos;

    expect(result.surplus).toBe(base.ingresoNeto - (expectedTotalBudgeted + 500));
    expect(result.surplus).not.toBe(base.ingresoNeto - expectedTotalBudgeted);
  });

  it("should use the realized value for totalActual when a category has been registered", () => {
    const month = buildMonth({ actual: { ocio: 250 } });

    const result = new MonthlyBudgetCalculator().calculate(month, base);
    const totalWithoutOcio = base.gastosFijos + base.inversion + base.fondoEmergencia + base.caprichos;

    expect(result.totalActual).toBe(totalWithoutOcio + 250);
  });

  it("should fall back to the budgeted value for totalActual when realized is null", () => {
    const month = buildMonth({ actual: { ocio: null } });

    const result = new MonthlyBudgetCalculator().calculate(month, base);
    const expectedTotalBudgeted = base.gastosFijos + base.inversion + base.fondoEmergencia + base.ocio + base.caprichos;

    expect(result.totalActual).toBe(expectedTotalBudgeted);
  });
});
