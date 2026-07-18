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
    const debts: Debt[] = [{ id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "", isLongTerm: false }];

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
    const debts: Debt[] = [{ id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "", isLongTerm: false, settledAt: "2026-01-01" }];

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

    expect(screen.getByText("Configura tu presupuesto en la pestaña Presupuesto para ver el flujo de este mes.")).toBeInTheDocument();
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

  it("should not subtract a long-term debt from the headline net worth", () => {
    const portfolioDerived = portfolioCalculator.derive([CASH_POSITION]);
    const mortgage: Debt = { id: "hipoteca", name: "Hipoteca", installment: 600, balance: 150000, note: "", isLongTerm: true };

    render(
      <DashboardTab
        portfolioDerived={portfolioDerived} debts={[mortgage]} baseBudget={null} months={[]}
        goalsSettings={null} wealthTargets={null}
      />,
    );

    expect(netWorthCardHeadline().textContent).toBe(currencyFormatter.euro(portfolioDerived.total));
  });

  it("should show the net worth including all debt as a small subtitle", () => {
    const portfolioDerived = portfolioCalculator.derive([CASH_POSITION]);
    const mortgage: Debt = { id: "hipoteca", name: "Hipoteca", installment: 600, balance: 150000, note: "", isLongTerm: true };

    render(
      <DashboardTab
        portfolioDerived={portfolioDerived} debts={[mortgage]} baseBudget={null} months={[]}
        goalsSettings={null} wealthTargets={null}
      />,
    );

    const expectedFullNetWorth = portfolioDerived.total - mortgage.balance;
    expect(screen.getByText("Patrimonio neto con toda la deuda:")).toBeInTheDocument();
    expect(getByExactText(currencyFormatter.euro(expectedFullNetWorth))).toBeInTheDocument();
  });

  it("should show a placeholder instead of the composition chart when the portfolio is empty", () => {
    const portfolioDerived = portfolioCalculator.derive([]);

    render(
      <DashboardTab portfolioDerived={portfolioDerived} debts={[]} baseBudget={null} months={[]} goalsSettings={null} wealthTargets={null} />,
    );

    expect(screen.getByText("Sin posiciones todavía. La composición aparecerá aquí en cuanto añadas tu primera posición.")).toBeInTheDocument();
  });

  it("should show the wealth composition legend with each group's share once there are positions", () => {
    const portfolioDerived = portfolioCalculator.derive([CASH_POSITION, FUND_POSITION]);

    render(
      <DashboardTab portfolioDerived={portfolioDerived} debts={[]} baseBudget={null} months={[]} goalsSettings={null} wealthTargets={null} />,
    );

    expect(screen.getByText("Liquidez")).toBeInTheDocument();
    expect(screen.getByText("Renta variable")).toBeInTheDocument();
    expect(screen.queryByText("Bitcoin")).not.toBeInTheDocument();
  });

  it("should prompt to configure the budget when there is no surplus history yet", () => {
    const portfolioDerived = portfolioCalculator.derive([]);

    render(
      <DashboardTab portfolioDerived={portfolioDerived} debts={[]} baseBudget={null} months={[]} goalsSettings={null} wealthTargets={null} />,
    );

    expect(screen.getByText("Configura tu presupuesto para ver el superávit de los últimos meses.")).toBeInTheDocument();
  });

  it("should show the surplus history once a month has been registered", () => {
    const portfolioDerived = portfolioCalculator.derive([]);
    const month: Month = monthFactory.createCurrent();

    render(
      <DashboardTab
        portfolioDerived={portfolioDerived} debts={[]} baseBudget={SAMPLE_BUDGET} months={[month]}
        goalsSettings={null} wealthTargets={null}
      />,
    );

    expect(screen.queryByText("Registra algún mes en Presupuesto para ver aquí su evolución.")).not.toBeInTheDocument();
  });

  it("should warn that the surplus trend is incomplete when only one month has been registered", () => {
    const portfolioDerived = portfolioCalculator.derive([]);
    const month: Month = monthFactory.createCurrent();

    render(
      <DashboardTab
        portfolioDerived={portfolioDerived} debts={[]} baseBudget={SAMPLE_BUDGET} months={[month]}
        goalsSettings={null} wealthTargets={null}
      />,
    );

    expect(screen.getByText("Necesitas al menos 2 meses registrados para ver la tendencia.")).toBeInTheDocument();
  });

  it("should not warn about an incomplete surplus trend once two or more months have been registered", () => {
    const portfolioDerived = portfolioCalculator.derive([]);
    const firstMonth: Month = monthFactory.create(2026, 5);
    const secondMonth: Month = monthFactory.create(2026, 6);

    render(
      <DashboardTab
        portfolioDerived={portfolioDerived} debts={[]} baseBudget={SAMPLE_BUDGET} months={[firstMonth, secondMonth]}
        goalsSettings={null} wealthTargets={null}
      />,
    );

    expect(screen.queryByText("Necesitas al menos 2 meses registrados para ver la tendencia.")).not.toBeInTheDocument();
  });

  it("should not warn about an incomplete surplus trend when there is no surplus history at all", () => {
    const portfolioDerived = portfolioCalculator.derive([]);

    render(
      <DashboardTab portfolioDerived={portfolioDerived} debts={[]} baseBudget={null} months={[]} goalsSettings={null} wealthTargets={null} />,
    );

    expect(screen.queryByText("Necesitas al menos 2 meses registrados para ver la tendencia.")).not.toBeInTheDocument();
  });
});
