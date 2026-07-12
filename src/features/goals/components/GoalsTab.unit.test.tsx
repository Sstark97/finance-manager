// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalsTab, type GoalsTabProps } from "@/features/goals/components/GoalsTab";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { Debt } from "@/shared/domain/types";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import { WEALTH_TARGETS_INITIAL } from "@/features/wealth/data/wealthTargets";
import { currencyFormatter } from "@/lib/CurrencyFormatter";

const portfolioDerived = new PortfolioCalculator().derive([]);

const SAMPLE_SETTINGS: GoalsSettings = {
  currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
  btcConditions: { disposable: true, dcaActive: true },
};

function renderGoalsTab(overrides: Partial<Pick<GoalsTabProps, "settings" | "debts" | "wealthTargets">> = {}) {
  const setDebts = vi.fn();
  const setSettings = vi.fn();

  const view = render(
    <GoalsTab
      portfolioDerived={portfolioDerived}
      debts={overrides.debts ?? []}
      setDebts={setDebts}
      settings={overrides.settings ?? null}
      setSettings={setSettings}
      wealthTargets={overrides.wealthTargets ?? null}
    />,
  );

  return { setDebts, setSettings, container: view.container };
}

describe("GoalsTab", () => {
  it("should render the explicit onboarding form when goals settings have not been configured yet", () => {
    renderGoalsTab({ settings: null });

    expect(screen.getByText("Configura tus metas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear mi configuración de metas" })).toBeInTheDocument();
  });

  it("should not persist anything while rendering the onboarding form", () => {
    const { setSettings } = renderGoalsTab({ settings: null });

    expect(setSettings).not.toHaveBeenCalled();
  });

  it("should create the goals settings only when the onboarding form is explicitly confirmed", () => {
    const { setSettings } = renderGoalsTab({ settings: null });

    fireEvent.click(screen.getByRole("button", { name: "Crear mi configuración de metas" }));

    expect(setSettings).toHaveBeenCalledTimes(1);
    expect(setSettings).toHaveBeenCalledWith({
      currentSalary: 0, fiContribution: 0, fiReturn: 0, btcSavings: 0,
      btcConditions: { disposable: false, dcaActive: false },
    });
  });

  it("should render the normal goals workspace when settings are already configured", () => {
    renderGoalsTab({ settings: SAMPLE_SETTINGS });

    expect(screen.queryByText("Configura tus metas")).not.toBeInTheDocument();
    expect(screen.getByText("Libertad financiera")).toBeInTheDocument();
  });

  it("should render the collapsed debts section without exposing debt inputs directly", () => {
    const debt: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };

    renderGoalsTab({ settings: SAMPLE_SETTINGS, debts: [debt] });

    expect(screen.getByText("Deudas y patrimonio neto")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Coche")).not.toBeInTheDocument();
  });

  it("should not show a checkbox to count the car as an asset, since that concept no longer exists", () => {
    renderGoalsTab({ settings: SAMPLE_SETTINGS, debts: [] });

    expect(screen.queryByText(/Contar el coche como activo/)).not.toBeInTheDocument();
  });

  it("should not show the hardcoded Apple Watch banner", () => {
    const debt: Debt = { id: "applewatch", name: "Apple Watch", installment: 50, balance: 200, note: "", deadline: "2026-07-10" };

    renderGoalsTab({ settings: SAMPLE_SETTINGS, debts: [debt] });

    expect(screen.queryByText(/Liquidar Apple Watch/)).not.toBeInTheDocument();
  });

  it("should fall back to the default wealth targets for the emergency fund card when none are configured", () => {
    const { container } = renderGoalsTab({ settings: SAMPLE_SETTINGS, wealthTargets: null });

    expect(container.textContent).toContain(`Objetivo 6 meses de gastos (${currencyFormatter.euro(WEALTH_TARGETS_INITIAL.emergencyFund)})`);
  });

  it("should read the configured emergency fund target instead of the default when one is provided", () => {
    const wealthTargets: WealthTargets = { ...WEALTH_TARGETS_INITIAL, emergencyFund: 9000 };

    const { container } = renderGoalsTab({ settings: SAMPLE_SETTINGS, wealthTargets });

    expect(container.textContent).toContain(`Objetivo 6 meses de gastos (${currencyFormatter.euro(9000)})`);
  });
});
