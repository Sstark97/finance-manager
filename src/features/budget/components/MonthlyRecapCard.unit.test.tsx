// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlyRecapCard } from "@/features/budget/components/MonthlyRecapCard";
import type { Month, Budget } from "@/features/budget/domain/types";
import { currencyFormatter } from "@/lib/CurrencyFormatter";

const baseBudget: Budget = {
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
  label: "Enero 2026",
  overrides: {},
  events: [],
  actual: {},
  netIncomeOverride: null,
  ...overrides,
});

describe("MonthlyRecapCard", () => {
  it("should show the total surplus for the selected month", () => {
    const month = buildMonth();

    const { container } = render(<MonthlyRecapCard month={month} months={[month]} baseBudget={baseBudget} />);

    const expectedTotalBudgeted = baseBudget.gastosFijos + baseBudget.inversion + baseBudget.fondoEmergencia + baseBudget.ocio + baseBudget.caprichos;
    expect(container.textContent).toContain(currencyFormatter.euroWithCents(baseBudget.ingresoNeto - expectedTotalBudgeted));
  });

  it("should list a category that has been overspent this month", () => {
    const month = buildMonth({ actual: { ocio: 450 } });

    render(<MonthlyRecapCard month={month} months={[month]} baseBudget={baseBudget} />);

    expect(screen.getByText("Ocio se pasó del plan")).toBeInTheDocument();
  });

  it("should show the no-overspending message when every category stays within its plan", () => {
    const month = buildMonth();

    render(<MonthlyRecapCard month={month} months={[month]} baseBudget={baseBudget} />);

    expect(screen.getByText("Ninguna categoría se ha pasado de presupuesto este mes.")).toBeInTheDocument();
  });

  it("should explain there is no previous month to compare against for the earliest registered month", () => {
    const month = buildMonth();

    render(<MonthlyRecapCard month={month} months={[month]} baseBudget={baseBudget} />);

    expect(screen.getByText("Aún no hay un mes anterior registrado con el que comparar.")).toBeInTheDocument();
  });

  it("should compare the selected month against the previous one when it exists", () => {
    const january = buildMonth({ id: "enero", label: "Enero 2026", date: new Date(2026, 0, 1) });
    const february = buildMonth({ id: "febrero", label: "Febrero 2026", date: new Date(2026, 1, 1), netIncomeOverride: 2000 });

    render(<MonthlyRecapCard month={february} months={[january, february]} baseBudget={baseBudget} />);

    expect(screen.getByText(/Frente a Enero 2026/)).toBeInTheDocument();
  });
});
