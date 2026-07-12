// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WealthTab } from "@/features/wealth/components/WealthTab";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Position } from "@/features/wealth/domain/types";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import { WEALTH_TARGETS_INITIAL } from "@/features/wealth/data/wealthTargets";
import { currencyFormatter } from "@/lib/CurrencyFormatter";

const portfolioCalculator = new PortfolioCalculator();

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false } as Response));
});

function renderWealthTab(portfolio: Position[], wealthTargets: WealthTargets | null = WEALTH_TARGETS_INITIAL) {
  const setPortfolio = vi.fn();
  const setWealthTargets = vi.fn();

  const view = render(
    <WealthTab
      portfolio={portfolio}
      setPortfolio={setPortfolio}
      portfolioDerived={portfolioCalculator.derive(portfolio)}
      debts={[]}
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
    const position: Position = { id: "efectivo-1", name: "Cuenta", ticker: "", type: "efectivo", units: 500, price: 1, group: "liquidez" };

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
});
