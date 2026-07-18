import { describe, expect, it } from "vitest";
import { DashboardSummaryCalculator } from "@/features/dashboard/domain/DashboardSummaryCalculator";
import { portfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Position } from "@/features/wealth/domain/types";
import type { Debt } from "@/shared/domain/types";
import type { Budget, Month } from "@/features/budget/domain/types";
import { monthFactory } from "@/features/budget/domain/MonthFactory";

const CASH_POSITION: Position = { id: "efectivo-1", name: "Cuenta", ticker: "", type: "efectivo", units: 5000, price: 1, group: "liquidez", equityIndex: null };
const SAMPLE_BUDGET: Budget = { ingresoNeto: 1800, gastosFijos: 700, inversion: 300, fondoEmergencia: 300, ocio: 300, caprichos: 200 };

describe("DashboardSummaryCalculator", () => {
  const calculator = new DashboardSummaryCalculator();

  it("should compute net worth as portfolio total minus active debt balance", () => {
    const portfolioDerived = portfolioCalculator.derive([CASH_POSITION]);
    const debts: Debt[] = [{ id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "", isLongTerm: false }];

    const summary = calculator.summarize(portfolioDerived, debts, null, [], null, null);

    expect(summary.netWorth.netWorth).toBe(portfolioDerived.total - 8000);
  });

  it("should exclude a settled debt from the net worth calculation", () => {
    const portfolioDerived = portfolioCalculator.derive([CASH_POSITION]);
    const debts: Debt[] = [{ id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "", isLongTerm: false, settledAt: "2026-01-01" }];

    const summary = calculator.summarize(portfolioDerived, debts, null, [], null, null);

    expect(summary.netWorth.netWorth).toBe(portfolioDerived.total);
  });

  it("should not subtract a debt marked as long term from the headline net worth", () => {
    const portfolioDerived = portfolioCalculator.derive([CASH_POSITION]);
    const mortgage: Debt = { id: "hipoteca", name: "Hipoteca", installment: 600, balance: 150000, note: "", isLongTerm: true };

    const summary = calculator.summarize(portfolioDerived, [mortgage], null, [], null, null);

    expect(summary.netWorth.netWorth).toBe(portfolioDerived.total);
  });

  it("should still reflect a debt marked as long term in the net worth including all debt", () => {
    const portfolioDerived = portfolioCalculator.derive([CASH_POSITION]);
    const mortgage: Debt = { id: "hipoteca", name: "Hipoteca", installment: 600, balance: 150000, note: "", isLongTerm: true };

    const summary = calculator.summarize(portfolioDerived, [mortgage], null, [], null, null);

    expect(summary.netWorth.netWorthIncludingAllDebt).toBe(portfolioDerived.total - mortgage.balance);
  });

  it("should have no monthly result when there is no base budget yet", () => {
    const portfolioDerived = portfolioCalculator.derive([]);

    const summary = calculator.summarize(portfolioDerived, [], null, [], null, null);

    expect(summary.monthlyResult).toBeNull();
  });

  it("should compute the monthly surplus once a month has been registered", () => {
    const portfolioDerived = portfolioCalculator.derive([]);
    const month: Month = monthFactory.createCurrent();

    const summary = calculator.summarize(portfolioDerived, [], SAMPLE_BUDGET, [month], null, null);

    const expectedTotalBudgeted = SAMPLE_BUDGET.gastosFijos + SAMPLE_BUDGET.inversion + SAMPLE_BUDGET.fondoEmergencia + SAMPLE_BUDGET.ocio + SAMPLE_BUDGET.caprichos;
    expect(summary.monthlyResult?.surplus).toBe(SAMPLE_BUDGET.ingresoNeto - expectedTotalBudgeted);
  });
});
