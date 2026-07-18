// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardTab } from "@/features/dashboard/components/DashboardTab";
import { portfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Position } from "@/features/wealth/domain/types";
import type { Debt } from "@/shared/domain/types";
import type { Budget, Month } from "@/features/budget/domain/types";
import { monthFactory } from "@/features/budget/domain/MonthFactory";
import { currencyFormatter } from "@/lib/CurrencyFormatter";

const CASH_POSITION: Position = { id: "efectivo-1", name: "Cuenta", ticker: "", type: "efectivo", units: 5000, price: 1, group: "liquidez", equityIndex: null };
const FUND_POSITION: Position = { id: "fondo-1", name: "Fidelity World", ticker: "0P0000KSPA.F", type: "fondo", units: 100, price: 20, group: "rv", equityIndex: "world" };

const SAMPLE_BUDGET: Budget = { ingresoNeto: 1800, gastosFijos: 700, inversion: 300, fondoEmergencia: 300, ocio: 300, caprichos: 200 };

function getByExactText(expectedText: string): HTMLElement {
  return screen.getByText((_text, element) => element?.textContent === expectedText);
}

function netWorthCardHeadline(): HTMLElement {
  const card = screen.getByText("Patrimonio neto").closest(".card") as HTMLElement;
  return card.querySelector(".disp") as HTMLElement;
}

describe("DashboardTab", () => {
  it("should show the net worth as the portfolio total minus the active debt balance", () => {
    const portfolioDerived = portfolioCalculator.derive([CASH_POSITION, FUND_POSITION]);
    const debts: Debt[] = [{ id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "" }];

    render(
      <DashboardTab
        portfolioDerived={portfolioDerived} debts={debts} baseBudget={null} months={[]}
        goalsSettings={null} wealthTargets={null}
      />,
    );

    const expectedNetWorth = portfolioDerived.total - 8000;
    expect(netWorthCardHeadline().textContent).toBe(currencyFormatter.euro(expectedNetWorth));
  });

  it("should exclude a settled debt from the net worth calculation", () => {
    const portfolioDerived = portfolioCalculator.derive([CASH_POSITION]);
    const debts: Debt[] = [{ id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "", settledAt: "2026-01-01" }];

    render(
      <DashboardTab
        portfolioDerived={portfolioDerived} debts={debts} baseBudget={null} months={[]}
        goalsSettings={null} wealthTargets={null}
      />,
    );

    expect(netWorthCardHeadline().textContent).toBe(currencyFormatter.euro(portfolioDerived.total));
  });

  it("should prompt to configure the budget when there is no base budget yet", () => {
    const portfolioDerived = portfolioCalculator.derive([]);

    render(
      <DashboardTab portfolioDerived={portfolioDerived} debts={[]} baseBudget={null} months={[]} goalsSettings={null} wealthTargets={null} />,
    );

    expect(screen.getByText(/Configura tu presupuesto/)).toBeInTheDocument();
  });

  it("should show the monthly surplus once a month has been registered", () => {
    const portfolioDerived = portfolioCalculator.derive([]);
    const month: Month = monthFactory.createCurrent();

    render(
      <DashboardTab
        portfolioDerived={portfolioDerived} debts={[]} baseBudget={SAMPLE_BUDGET} months={[month]}
        goalsSettings={null} wealthTargets={null}
      />,
    );

    const expectedTotalBudgeted = SAMPLE_BUDGET.gastosFijos + SAMPLE_BUDGET.inversion + SAMPLE_BUDGET.fondoEmergencia + SAMPLE_BUDGET.ocio + SAMPLE_BUDGET.caprichos;
    const expectedSurplus = SAMPLE_BUDGET.ingresoNeto - expectedTotalBudgeted;
    expect(getByExactText(currencyFormatter.euroWithCents(expectedSurplus))).toBeInTheDocument();
  });
});
