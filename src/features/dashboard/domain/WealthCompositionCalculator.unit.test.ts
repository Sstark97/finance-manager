import { describe, expect, it } from "vitest";
import { WealthCompositionCalculator } from "@/features/dashboard/domain/WealthCompositionCalculator";
import { portfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Position } from "@/features/wealth/domain/types";

const CASH_POSITION: Position = { id: "efectivo-1", name: "Cuenta", ticker: "", type: "efectivo", units: 5000, price: 1, group: "liquidez", equityIndex: null };
const FUND_POSITION: Position = { id: "fondo-1", name: "Fidelity World", ticker: "0P0000KSPA.F", type: "fondo", units: 100, price: 20, group: "rv", equityIndex: "world" };
const CRYPTO_POSITION: Position = { id: "cripto-1", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.1, price: 50000, group: "btc", equityIndex: null };

describe("WealthCompositionCalculator", () => {
  const calculator = new WealthCompositionCalculator();

  it("should group the portfolio into liquidity, equity and bitcoin slices", () => {
    const portfolioDerived = portfolioCalculator.derive([CASH_POSITION, FUND_POSITION, CRYPTO_POSITION]);

    const composition = calculator.compose(portfolioDerived);

    expect(composition).toEqual([
      { name: "Liquidez", value: portfolioDerived.liquidityTotal },
      { name: "Renta variable", value: portfolioDerived.equity },
      { name: "Bitcoin", value: portfolioDerived.btcTotal },
    ]);
  });

  it("should omit a group that has no value", () => {
    const portfolioDerived = portfolioCalculator.derive([CASH_POSITION]);

    const composition = calculator.compose(portfolioDerived);

    expect(composition).toEqual([{ name: "Liquidez", value: portfolioDerived.liquidityTotal }]);
  });

  it("should return an empty composition for an empty portfolio", () => {
    const portfolioDerived = portfolioCalculator.derive([]);

    expect(calculator.compose(portfolioDerived)).toEqual([]);
  });
});
