import { describe, expect, it } from "vitest";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Position } from "@/features/wealth/domain/types";

describe("PortfolioCalculator", () => {
  const worldFund: Position = {
    id: "world-fund", name: "Fidelity MSCI World", ticker: "0P0000KSPA.F",
    type: "fondo", units: 10, price: 20, group: "rv", equityIndex: "world",
  };
  const anotherWorldFund: Position = {
    id: "world-etf", name: "iShares MSCI World", ticker: "IWDA.L",
    type: "etf", units: 2, price: 30, group: "rv", equityIndex: "world",
  };
  const emergingFund: Position = {
    id: "em-fund", name: "Fidelity Emerging Markets", ticker: "0P0000KSP9.F",
    type: "fondo", units: 5, price: 10, group: "rv", equityIndex: "em",
  };
  const bitcoin: Position = {
    id: "btc", name: "Bitcoin", ticker: "BTC-EUR",
    type: "cripto", units: 0.01, price: 50000, group: "btc", equityIndex: null,
  };
  const cash: Position = {
    id: "liquidez", name: "Fondo emergencia", ticker: "",
    type: "efectivo", units: 300, price: 1, group: "liquidez", equityIndex: null,
  };
  const emptyPosition: Position = {
    id: "vacia", name: "Posición sin saldo", ticker: "",
    type: "fondo", units: 0, price: 15, group: "rv", equityIndex: null,
  };

  it("should value an efectivo position as its units, ignoring price", () => {
    const derived = new PortfolioCalculator().derive([cash]);

    expect(derived.withValue[0].value).toBe(300);
  });

  it("should value a non-efectivo position as units times price", () => {
    const derived = new PortfolioCalculator().derive([worldFund]);

    expect(derived.withValue[0].value).toBe(10 * 20);
  });

  it("should compute total, invested, liquidityTotal, equity and btcTotal across the whole portfolio", () => {
    const derived = new PortfolioCalculator().derive([worldFund, emergingFund, bitcoin, cash]);

    const worldValue = 10 * 20;
    const emergingValue = 5 * 10;
    const bitcoinValue = 0.01 * 50000;
    const cashValue = 300;

    expect(derived.total).toBe(worldValue + emergingValue + bitcoinValue + cashValue);
    expect(derived.invested).toBe(worldValue + emergingValue + bitcoinValue);
    expect(derived.liquidityTotal).toBe(cashValue);
    expect(derived.equity).toBe(worldValue + emergingValue);
    expect(derived.btcTotal).toBe(bitcoinValue);
  });

  it("should compute btcWeightTotal as the percentage of total held in btc", () => {
    const derived = new PortfolioCalculator().derive([worldFund, bitcoin]);

    const worldValue = 10 * 20;
    const bitcoinValue = 0.01 * 50000;
    const expectedTotal = worldValue + bitcoinValue;

    expect(derived.btcWeightTotal).toBeCloseTo((bitcoinValue / expectedTotal) * 100);
  });

  it("should compute equityWeightOf as the percentage a given equity index represents within equity", () => {
    const derived = new PortfolioCalculator().derive([worldFund, emergingFund]);

    const worldValue = 10 * 20;
    const emergingValue = 5 * 10;
    const equityTotal = worldValue + emergingValue;

    expect(derived.equityWeightOf("world")).toBeCloseTo((worldValue / equityTotal) * 100);
    expect(derived.equityWeightOf("em")).toBeCloseTo((emergingValue / equityTotal) * 100);
  });

  it("should sum several equity positions that track the same index", () => {
    const derived = new PortfolioCalculator().derive([worldFund, anotherWorldFund, emergingFund]);

    const worldValue = 10 * 20 + 2 * 30;
    const emergingValue = 5 * 10;
    const equityTotal = worldValue + emergingValue;

    expect(derived.equityWeightOf("world")).toBeCloseTo((worldValue / equityTotal) * 100);
  });

  it("should return 0 for an index that no position tracks", () => {
    const derived = new PortfolioCalculator().derive([worldFund]);

    expect(derived.equityWeightOf("nasdaq")).toBe(0);
  });

  it("should not expose color on positions or a pieCartera field, since presentation is derived in the UI", () => {
    const derived = new PortfolioCalculator().derive([worldFund, emptyPosition]);

    expect(derived).not.toHaveProperty("pieCartera");
    expect(derived.withValue[0]).not.toHaveProperty("color");
  });
});
