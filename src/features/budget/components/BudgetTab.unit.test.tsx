// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BudgetTab, type BudgetTabProps } from "@/features/budget/components/BudgetTab";
import type { Budget } from "@/features/budget/domain/types";
import { monthFactory } from "@/features/budget/domain/MonthFactory";
import { saveBudget } from "@/app/actions/saveBudget";

vi.mock("@/app/actions/saveBudget", () => ({ saveBudget: vi.fn().mockResolvedValue(undefined) }));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderBudgetTab(overrides: Partial<Pick<BudgetTabProps, "initialBaseBudget" | "initialMonths" | "initialFixedExpenseItems">> = {}) {
  return render(
    <BudgetTab
      initialBaseBudget={overrides.initialBaseBudget ?? null}
      initialMonths={overrides.initialMonths ?? []}
      initialFixedExpenseItems={overrides.initialFixedExpenseItems ?? []}
    />,
  );
}

const SAMPLE_BUDGET: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };

describe("BudgetTab", () => {
  it("should render the onboarding form when there is no base budget configured yet", () => {
    renderBudgetTab({ initialBaseBudget: null, initialMonths: [] });

    expect(screen.getByText("Configura tu presupuesto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear mi presupuesto" })).toBeInTheDocument();
  });

  it("should offer to register the current month when the base budget exists but there are no months yet", () => {
    renderBudgetTab({ initialBaseBudget: SAMPLE_BUDGET, initialMonths: [] });

    expect(screen.getByRole("button", { name: "Registrar mes actual" })).toBeInTheDocument();
    expect(screen.queryByText("Cargar información del mes")).not.toBeInTheDocument();
  });

  it("should render the monthly breakdown when both the base budget and at least one month exist", () => {
    const month = monthFactory.create(2026, 5);

    renderBudgetTab({ initialBaseBudget: SAMPLE_BUDGET, initialMonths: [month] });

    expect(screen.getByText("Cargar información del mes")).toBeInTheDocument();
  });

  it("should register the current month when the user confirms the register-month call to action", () => {
    renderBudgetTab({ initialBaseBudget: SAMPLE_BUDGET, initialMonths: [] });

    fireEvent.click(screen.getByRole("button", { name: "Registrar mes actual" }));

    expect(screen.getByText("Cargar información del mes")).toBeInTheDocument();
  });

  it("should create the base budget and the current month together when the onboarding form is confirmed", () => {
    renderBudgetTab({ initialBaseBudget: null, initialMonths: [] });

    fireEvent.click(screen.getByRole("button", { name: "Crear mi presupuesto" }));

    expect(screen.queryByText("Configura tu presupuesto")).not.toBeInTheDocument();
    expect(screen.getByText("Cargar información del mes")).toBeInTheDocument();
  });

  describe("autosave", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should persist the base budget once the debounce window elapses after an edit", async () => {
      renderBudgetTab({ initialBaseBudget: SAMPLE_BUDGET, initialMonths: [monthFactory.create(2026, 5)] });

      fireEvent.click(screen.getByRole("button", { name: "Editar presupuesto" }));
      fireEvent.change(screen.getByRole("spinbutton", { name: "Ingreso neto /mes" }), { target: { value: "2000" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(saveBudget).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(800);

      expect(saveBudget).toHaveBeenCalledWith(expect.objectContaining({ baseBudget: expect.objectContaining({ ingresoNeto: 2000 }) }));
    });

    it("should flush a pending budget save synchronously when the tab unmounts before the debounce fires", () => {
      const { unmount } = renderBudgetTab({ initialBaseBudget: SAMPLE_BUDGET, initialMonths: [monthFactory.create(2026, 5)] });

      fireEvent.click(screen.getByRole("button", { name: "Editar presupuesto" }));
      fireEvent.change(screen.getByRole("spinbutton", { name: "Ingreso neto /mes" }), { target: { value: "2000" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      unmount();

      expect(saveBudget).toHaveBeenCalledWith(expect.objectContaining({ baseBudget: expect.objectContaining({ ingresoNeto: 2000 }) }));
    });
  });
});
