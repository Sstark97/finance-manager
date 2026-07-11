// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WealthTab } from "@/features/wealth/components/WealthTab";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Position } from "@/features/wealth/domain/types";

const portfolioCalculator = new PortfolioCalculator();

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false } as Response));
});

function renderWealthTab(portfolio: Position[]) {
  const setPortfolio = vi.fn();

  render(
    <WealthTab
      portfolio={portfolio}
      setPortfolio={setPortfolio}
      portfolioDerived={portfolioCalculator.derive(portfolio)}
      debts={[]}
    />,
  );

  return { setPortfolio };
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
});
