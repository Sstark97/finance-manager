// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Position } from "@/features/wealth/domain/types";
import type { Debt } from "@/shared/domain/types";
import type { BudgetSnapshot } from "@/features/budget/application/BudgetSnapshot";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import { monthFactory } from "@/features/budget/domain/MonthFactory";

const requireUserIdMock = vi.hoisted(() => vi.fn());
const loadPortfolioInvoke = vi.hoisted(() => vi.fn());
const loadDebtsInvoke = vi.hoisted(() => vi.fn());
const loadBudgetInvoke = vi.hoisted(() => vi.fn());
const loadGoalsSettingsInvoke = vi.hoisted(() => vi.fn());
const loadWealthTargetsInvoke = vi.hoisted(() => vi.fn());

vi.mock("@/infrastructure/auth/CurrentUserProvider", () => ({
  currentUserProvider: { requireUserId: requireUserIdMock },
}));
vi.mock("@/lib/di/ContainerDI", () => ({
  container: {
    loadPortfolio: () => ({ invoke: loadPortfolioInvoke }),
    loadDebts: () => ({ invoke: loadDebtsInvoke }),
    loadBudget: () => ({ invoke: loadBudgetInvoke }),
    loadGoalsSettings: () => ({ invoke: loadGoalsSettingsInvoke }),
    loadWealthTargets: () => ({ invoke: loadWealthTargetsInvoke }),
  },
}));

import DashboardPage from "@/app/(app)/page";

const EMPTY_BUDGET: BudgetSnapshot = { baseBudget: null, fixedExpenseItems: [], months: [] };

function netWorthCardHeadline(): HTMLElement {
  const card = screen.getByText("Patrimonio neto").closest(".card") as HTMLElement;
  return card.querySelector(".disp") as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false } as Response));
  requireUserIdMock.mockResolvedValue("user-1");
  loadPortfolioInvoke.mockResolvedValue([] as Position[]);
  loadDebtsInvoke.mockResolvedValue([] as Debt[]);
  loadBudgetInvoke.mockResolvedValue(EMPTY_BUDGET);
  loadGoalsSettingsInvoke.mockResolvedValue(null);
  loadWealthTargetsInvoke.mockResolvedValue(null);
});

describe("DashboardPage", () => {
  it("should render the section heading for the Resumen route", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "Resumen financiero" })).toBeInTheDocument();
  });

  it("should show the net worth as the portfolio total minus the active debt balance", async () => {
    const cashPosition: Position = { id: "efectivo-1", name: "Cuenta", ticker: "", type: "efectivo", units: 5000, price: 1, group: "liquidez", equityIndex: null };
    const activeDebt: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "", isLongTerm: false };
    loadPortfolioInvoke.mockResolvedValue([cashPosition]);
    loadDebtsInvoke.mockResolvedValue([activeDebt]);

    render(await DashboardPage());

    expect(netWorthCardHeadline().textContent).toBe(currencyFormatter.euro(5000 - 8000));
  });

  it("should exclude a settled debt from the net worth calculation", async () => {
    const cashPosition: Position = { id: "efectivo-1", name: "Cuenta", ticker: "", type: "efectivo", units: 5000, price: 1, group: "liquidez", equityIndex: null };
    const settledDebt: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "", isLongTerm: false, settledAt: "2026-01-01" };
    loadPortfolioInvoke.mockResolvedValue([cashPosition]);
    loadDebtsInvoke.mockResolvedValue([settledDebt]);

    render(await DashboardPage());

    expect(netWorthCardHeadline().textContent).toBe(currencyFormatter.euro(5000));
  });

  it("should prompt to configure the budget when there is no base budget yet", async () => {
    render(await DashboardPage());

    expect(screen.getByText("Configura tu presupuesto en la pestaña Presupuesto para ver el flujo de este mes.")).toBeInTheDocument();
  });

  it("should show the monthly surplus once a month has been registered", async () => {
    const baseBudget = { ingresoNeto: 1800, gastosFijos: 700, inversion: 300, fondoEmergencia: 300, ocio: 300, caprichos: 200 };
    const month = monthFactory.createCurrent();
    loadBudgetInvoke.mockResolvedValue({ baseBudget, fixedExpenseItems: [], months: [month] });

    render(await DashboardPage());

    const expectedTotalBudgeted = baseBudget.gastosFijos + baseBudget.inversion + baseBudget.fondoEmergencia + baseBudget.ocio + baseBudget.caprichos;
    const expectedSurplus = baseBudget.ingresoNeto - expectedTotalBudgeted;
    expect(screen.getByText((_text, element) => element?.textContent === currencyFormatter.euroWithCents(expectedSurplus))).toBeInTheDocument();
  });

  it("should show a placeholder instead of the composition chart when the portfolio is empty", async () => {
    render(await DashboardPage());

    expect(screen.getByText("Sin posiciones todavía. La composición aparecerá aquí en cuanto añadas tu primera posición.")).toBeInTheDocument();
  });

  it("should show the wealth composition legend once there are positions", async () => {
    const cashPosition: Position = { id: "efectivo-1", name: "Cuenta", ticker: "", type: "efectivo", units: 5000, price: 1, group: "liquidez", equityIndex: null };
    loadPortfolioInvoke.mockResolvedValue([cashPosition]);

    render(await DashboardPage());

    expect(screen.getByText("Liquidez")).toBeInTheDocument();
  });

  it("should prompt to configure the budget when there is no surplus history yet", async () => {
    render(await DashboardPage());

    expect(screen.getByText("Configura tu presupuesto para ver el superávit de los últimos meses.")).toBeInTheDocument();
  });

  it("should render the wealth evolution chart with its range selector", async () => {
    render(await DashboardPage());

    expect(screen.getByText("Evolución del patrimonio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "YTD" })).toBeInTheDocument();
  });
});
