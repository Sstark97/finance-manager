// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WealthTab } from "@/features/wealth/components/WealthTab";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Position } from "@/features/wealth/domain/types";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import { WEALTH_TARGETS_INITIAL } from "@/features/wealth/data/wealthTargets";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import type { Debt } from "@/shared/domain/types";

const portfolioCalculator = new PortfolioCalculator();

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false } as Response));
});

function renderWealthTab(portfolio: Position[], wealthTargets: WealthTargets | null = WEALTH_TARGETS_INITIAL, debts: Debt[] = []) {
  const setPortfolio = vi.fn();
  const setWealthTargets = vi.fn();

  const view = render(
    <WealthTab
      portfolio={portfolio}
      setPortfolio={setPortfolio}
      portfolioDerived={portfolioCalculator.derive(portfolio)}
      debts={debts}
      wealthTargets={wealthTargets}
      setWealthTargets={setWealthTargets}
    />,
  );

  return { setPortfolio, setWealthTargets, container: view.container };
}

describe("WealthTab", () => {
  it("should invite the user to add their first position when the portfolio is empty", () => {
    renderWealthTab([]);

    expect(screen.getByText("Aún no tienes posiciones")).toBeInTheDocument();
  });

  it("should show a placeholder instead of the distribution chart when the portfolio is empty", () => {
    renderWealthTab([]);

    expect(screen.getByText("Sin posiciones todavía. La distribución aparecerá aquí en cuanto añadas tu primera posición.")).toBeInTheDocument();
  });

  it("should not show the empty-portfolio invitation once a position exists", () => {
    const position: Position = { id: "efectivo-1", name: "Cuenta", ticker: "", type: "efectivo", units: 500, price: 1, group: "liquidez", equityIndex: null };

    renderWealthTab([position]);

    expect(screen.queryByText("Aún no tienes posiciones")).not.toBeInTheDocument();
  });

  it("should show the wealth targets onboarding when there are no targets configured yet", () => {
    renderWealthTab([], null);

    expect(screen.getByText("Configura tus objetivos de patrimonio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear mis objetivos" })).toBeInTheDocument();
  });

  it("should degrade the plan cards to an empty state when there are no wealth targets configured", () => {
    renderWealthTab([], null);

    expect(screen.getByText("Configura tus objetivos de patrimonio para ver tu nota de cartera.")).toBeInTheDocument();
    expect(screen.getByText("Configura tus objetivos de patrimonio para ver el estado de tu plan.")).toBeInTheDocument();
    expect(screen.getByText("Configura tus objetivos de patrimonio para ver la renta variable real frente al objetivo.")).toBeInTheDocument();
    expect(screen.getByText("Configura tus objetivos de patrimonio para ver el progreso del fondo de emergencia.")).toBeInTheDocument();
  });

  it("should not show the wealth targets onboarding or the targets editor button once targets are configured", () => {
    renderWealthTab([], WEALTH_TARGETS_INITIAL);

    expect(screen.queryByText("Configura tus objetivos de patrimonio")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar objetivos" })).toBeInTheDocument();
  });

  it("should reflect the configured emergency fund target in the emergency fund card", () => {
    const { container } = renderWealthTab([], { ...WEALTH_TARGETS_INITIAL, emergencyFund: 9000 });

    expect(container.textContent).toContain(`/ ${currencyFormatter.euro(9000)}`);
  });

  it("should stop showing the World real-vs-target bar as dimmed and at 0% once a fund tracking that index exists", () => {
    const worldFund: Position = { id: "random-fund-id", name: "Fidelity MSCI World", ticker: "0P0000KSPA.F", type: "fondo", units: 10, price: 20, group: "rv", equityIndex: "world" };

    renderWealthTab([worldFund]);

    const equityTargetsCard = screen.getByText(/Renta variable/).closest(".card") as HTMLElement;
    const equityTargetsSection = within(equityTargetsCard);
    expect(equityTargetsSection.getByText("100.0%")).toBeInTheDocument();
    const worldBarRow = equityTargetsSection.getByText("World").closest("div")!.parentElement as HTMLElement;
    expect(worldBarRow).toHaveStyle({ opacity: "1" });
  });

  it("should show an index selector for fondo and etf positions in the portfolio editor", async () => {
    const worldFund: Position = { id: "random-fund-id", name: "Fidelity MSCI World", ticker: "0P0000KSPA.F", type: "fondo", units: 10, price: 20, group: "rv", equityIndex: "world" };
    const user = userEvent.setup();

    renderWealthTab([worldFund]);
    await user.click(screen.getByRole("button", { name: "Editar cartera" }));

    const indexSelect = screen.getByRole("combobox", { name: "Índice" });
    expect(indexSelect).toHaveValue("world");
  });

  it("should not show an index selector for cripto or efectivo positions in the portfolio editor", async () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.01, price: 50000, group: "btc", equityIndex: null };
    const user = userEvent.setup();

    renderWealthTab([bitcoin]);
    await user.click(screen.getByRole("button", { name: "Editar cartera" }));

    expect(screen.queryByRole("combobox", { name: "Índice" })).not.toBeInTheDocument();
  });

  it("should exclude settled debts from the net worth calculation, counting only active ones", () => {
    const cashPosition: Position = { id: "efectivo-1", name: "Cuenta", ticker: "", type: "efectivo", units: 10000, price: 1, group: "liquidez", equityIndex: null };
    const activeDebt: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 3000, note: "" };
    const settledDebt: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "", settledAt: "2026-06-01" };

    const { container } = renderWealthTab([cashPosition], WEALTH_TARGETS_INITIAL, [activeDebt, settledDebt]);

    expect(container.textContent).toContain(currencyFormatter.euroWithCents(10000 - activeDebt.balance));
  });
});
