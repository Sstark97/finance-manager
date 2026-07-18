// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WealthEvolutionChart } from "@/features/wealth/components/WealthEvolutionChart";
import type { Position } from "@/features/wealth/domain/types";
import type { PortfolioHistoryResult } from "@/features/wealth/application/ComputePortfolioHistory";

const CASH_POSITION: Position = { id: "efectivo-1", name: "Cuenta", ticker: "", type: "efectivo", units: 500, price: 1, group: "liquidez", equityIndex: null };

function stubFetchWithHistory(result: PortfolioHistoryResult): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(result),
  } as Response));
}

function stubFailingFetch(): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false } as Response));
}

beforeEach(() => {
  stubFailingFetch();
});

describe("WealthEvolutionChart", () => {
  it("should show the range selector buttons", () => {
    render(<WealthEvolutionChart portfolio={[CASH_POSITION]} total={500} liquidityTotal={500} />);

    expect(screen.getByRole("button", { name: "YTD" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Año" })).toBeInTheDocument();
  });

  it("should request the history for the selected range on mount", async () => {
    stubFetchWithHistory({ points: [{ label: "ene", total: 500 }], failedTickers: [] });

    render(<WealthEvolutionChart portfolio={[CASH_POSITION]} total={500} liquidityTotal={500} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/prices/history", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ positions: [CASH_POSITION], range: "ytd" }),
    })));
  });

  it("should request a new history when the user picks a different range", async () => {
    stubFetchWithHistory({ points: [{ label: "ene", total: 500 }], failedTickers: [] });
    const user = userEvent.setup();

    render(<WealthEvolutionChart portfolio={[CASH_POSITION]} total={500} liquidityTotal={500} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Semana" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/prices/history", expect.objectContaining({
      body: JSON.stringify({ positions: [CASH_POSITION], range: "1w" }),
    })));
  });

  it("should warn when some tickers could not be reconstructed", async () => {
    stubFetchWithHistory({ points: [{ label: "ene", total: 500 }], failedTickers: ["BTC-EUR"] });

    render(<WealthEvolutionChart portfolio={[CASH_POSITION]} total={500} liquidityTotal={500} />);

    expect(await screen.findByText("No se pudo reconstruir el histórico de: BTC-EUR.")).toBeInTheDocument();
  });

  it("should warn when the history backend cannot be reached", async () => {
    stubFailingFetch();

    render(<WealthEvolutionChart portfolio={[CASH_POSITION]} total={500} liquidityTotal={500} />);

    expect(await screen.findByText("No se pudo conectar con el backend de histórico. Se mantiene la última serie cargada.")).toBeInTheDocument();
  });

  it("should notify the change and change percent computed from the loaded history", async () => {
    stubFetchWithHistory({ points: [{ label: "ene", total: 400 }], failedTickers: [] });
    const onSummaryChange = vi.fn();

    render(<WealthEvolutionChart portfolio={[CASH_POSITION]} total={500} liquidityTotal={100} onSummaryChange={onSummaryChange} />);

    const expectedChange = 500 - 400;
    const expectedChangePercent = (expectedChange / (400 - 100)) * 100;
    await waitFor(() => expect(onSummaryChange).toHaveBeenCalledWith({ change: expectedChange, changePercent: expectedChangePercent }));
  });
});
