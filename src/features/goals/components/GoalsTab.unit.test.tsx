// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalsTab, type GoalsTabProps } from "@/features/goals/components/GoalsTab";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import { WEALTH_TARGETS_INITIAL } from "@/features/wealth/data/wealthTargets";
import { currencyFormatter } from "@/lib/CurrencyFormatter";

const portfolioDerived = new PortfolioCalculator().derive([]);

const SAMPLE_SETTINGS: GoalsSettings = {
  currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
  btcConditions: { disposable: true, dcaActive: true },
};

function renderGoalsTab(overrides: Partial<Pick<GoalsTabProps, "settings" | "wealthTargets">> = {}) {
  const setSettings = vi.fn();

  const view = render(
    <GoalsTab
      portfolioDerived={portfolioDerived}
      settings={overrides.settings ?? null}
      setSettings={setSettings}
      wealthTargets={overrides.wealthTargets ?? null}
    />,
  );

  return { setSettings, container: view.container };
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

  it("should not show a checkbox to count the car as an asset, since that concept no longer exists", () => {
    renderGoalsTab({ settings: SAMPLE_SETTINGS });

    expect(screen.queryByText(/Contar el coche como activo/)).not.toBeInTheDocument();
  });

  it("should not show the hardcoded Apple Watch banner", () => {
    renderGoalsTab({ settings: SAMPLE_SETTINGS });

    expect(screen.queryByText(/Liquidar Apple Watch/)).not.toBeInTheDocument();
  });

  it("should not render the debts section, since debts now live in their own tab", () => {
    renderGoalsTab({ settings: SAMPLE_SETTINGS });

    expect(screen.queryByText("Deudas y patrimonio neto")).not.toBeInTheDocument();
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
