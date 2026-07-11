// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BudgetTab, type BudgetTabProps } from "@/features/budget/components/BudgetTab";
import type { Budget, FixedExpenseItem, Month } from "@/features/budget/domain/types";
import { monthFactory } from "@/features/budget/domain/MonthFactory";

function renderBudgetTab(overrides: Partial<Pick<BudgetTabProps, "baseBudget" | "months" | "fixedExpenseItems">> = {}) {
  const setBaseBudget = vi.fn();
  const setMonths = vi.fn();
  const setFixedExpenseItems = vi.fn();

  render(
    <BudgetTab
      baseBudget={overrides.baseBudget ?? null}
      setBaseBudget={setBaseBudget}
      months={overrides.months ?? []}
      setMonths={setMonths}
      fixedExpenseItems={overrides.fixedExpenseItems ?? []}
      setFixedExpenseItems={setFixedExpenseItems}
    />,
  );

  return { setBaseBudget, setMonths, setFixedExpenseItems };
}

const SAMPLE_BUDGET: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };

describe("BudgetTab", () => {
  it("should render the onboarding form instead of crashing when there is no base budget configured yet", () => {
    renderBudgetTab({ baseBudget: null, months: [] });

    expect(screen.getByText("Configura tu presupuesto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear mi presupuesto" })).toBeInTheDocument();
  });

  it("should not crash and should offer to register the current month when the base budget exists but there are no months yet", () => {
    renderBudgetTab({ baseBudget: SAMPLE_BUDGET, months: [] });

    expect(screen.getByRole("button", { name: "Registrar mes actual" })).toBeInTheDocument();
    expect(screen.queryByText("Cargar información del mes")).not.toBeInTheDocument();
  });

  it("should render the monthly breakdown when both the base budget and at least one month exist", () => {
    const month = monthFactory.create(2026, 5);

    renderBudgetTab({ baseBudget: SAMPLE_BUDGET, months: [month] });

    expect(screen.getByText("Cargar información del mes")).toBeInTheDocument();
  });

  it("should register the current month when the user confirms the register-month call to action", () => {
    const { setMonths } = renderBudgetTab({ baseBudget: SAMPLE_BUDGET, months: [] });

    fireEvent.click(screen.getByRole("button", { name: "Registrar mes actual" }));

    expect(setMonths).toHaveBeenCalledTimes(1);
    const updater = setMonths.mock.calls[0][0] as (months: Month[]) => Month[];
    expect(updater([])).toHaveLength(1);
  });

  it("should create the base budget and the current month together when the onboarding form is confirmed", () => {
    const { setBaseBudget, setFixedExpenseItems, setMonths } = renderBudgetTab({ baseBudget: null, months: [] });

    fireEvent.click(screen.getByRole("button", { name: "Crear mi presupuesto" }));

    expect(setBaseBudget).toHaveBeenCalledWith({ ingresoNeto: 0, gastosFijos: 0, inversion: 0, fondoEmergencia: 0, ocio: 0, caprichos: 0 });
    expect(setFixedExpenseItems).toHaveBeenCalledWith([] as FixedExpenseItem[]);
    const monthsUpdater = setMonths.mock.calls[0][0] as (months: Month[]) => Month[];
    expect(monthsUpdater([])).toHaveLength(1);
  });
});
