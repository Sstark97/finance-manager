import { describe, expect, it } from "vitest";
import { PortfolioHistoryCalculator } from "@/features/wealth/domain/PortfolioHistoryCalculator";
import type { AssetPriceHistory } from "@/features/wealth/domain/AssetPriceHistory";
import type { Position } from "@/features/wealth/domain/types";

function dayEpochSecondsFor(year: number, month: number, day: number): number {
  return Date.UTC(year, month, day, 0, 0, 0) / 1000;
}

function etfPosition(overrides: Partial<Position> = {}): Position {
  return { id: "nasdaq", name: "iShares Nasdaq 100", ticker: "CNDX.L", type: "etf", units: 2, price: 1000, group: "rv", ...overrides };
}

function cryptoPosition(overrides: Partial<Position> = {}): Position {
  return { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 1, price: 100, group: "btc", ...overrides };
}

function cashPosition(units: number): Position {
  return { id: "liquidez", name: "Fondo emergencia", ticker: "", type: "efectivo", units, price: 1, group: "liquidez" };
}

describe("PortfolioHistoryCalculator", () => {
  const calculator = new PortfolioHistoryCalculator();
  const day1 = dayEpochSecondsFor(2026, 6, 1);
  const day2 = dayEpochSecondsFor(2026, 6, 2);
  const day3 = dayEpochSecondsFor(2026, 6, 3);

  it("should union staggered instrument calendars into the master axis and forward-fill the instrument missing a bar", () => {
    const nasdaqEtf = etfPosition({ units: 2 });
    const bitcoin = cryptoPosition({ units: 1 });
    const etfCloseOnDay1 = 10;
    const etfCloseOnDay3 = 12;
    const btcCloseOnDay1 = 100;
    const btcCloseOnDay2 = 110;
    const btcCloseOnDay3 = 120;

    const etfHistory: AssetPriceHistory = {
      ticker: "CNDX.L",
      currency: "EUR",
      gmtOffsetSeconds: 0,
      points: [
        { timestamp: day1, close: etfCloseOnDay1 },
        { timestamp: day3, close: etfCloseOnDay3 },
      ],
    };
    const btcHistory: AssetPriceHistory = {
      ticker: "BTC-EUR",
      currency: "EUR",
      gmtOffsetSeconds: 0,
      points: [
        { timestamp: day1, close: btcCloseOnDay1 },
        { timestamp: day2, close: btcCloseOnDay2 },
        { timestamp: day3, close: btcCloseOnDay3 },
      ],
    };

    const points = calculator.calculate({
      positions: [nasdaqEtf, bitcoin],
      historyByTicker: new Map([["CNDX.L", etfHistory], ["BTC-EUR", btcHistory]]),
      exchangeRateHistoryByCurrency: new Map(),
      range: "1m",
    });

    expect(points).toHaveLength(3);
    expect(points[0].total).toBe(nasdaqEtf.units * etfCloseOnDay1 + bitcoin.units * btcCloseOnDay1);
    expect(points[1].total).toBe(nasdaqEtf.units * etfCloseOnDay1 + bitcoin.units * btcCloseOnDay2);
    expect(points[2].total).toBe(nasdaqEtf.units * etfCloseOnDay3 + bitcoin.units * btcCloseOnDay3);
  });

  it("should convert a USD-denominated instrument through that bucket's exchange rate, not a single last-point rate", () => {
    const nasdaqEtf = etfPosition({ units: 2 });
    const closeInUsdOnDay1 = 100;
    const closeInUsdOnDay2 = 110;
    const exchangeRateOnDay1 = 0.9;
    const exchangeRateOnDay2 = 0.8;

    const etfHistory: AssetPriceHistory = {
      ticker: "CNDX.L",
      currency: "USD",
      gmtOffsetSeconds: 3600,
      points: [
        { timestamp: day1 + 25200, close: closeInUsdOnDay1 },
        { timestamp: day2 + 25200, close: closeInUsdOnDay2 },
      ],
    };
    const usdExchangeRateHistory: AssetPriceHistory = {
      ticker: "USDEUR=X",
      currency: "EUR",
      gmtOffsetSeconds: 0,
      points: [
        { timestamp: day1, close: exchangeRateOnDay1 },
        { timestamp: day2, close: exchangeRateOnDay2 },
      ],
    };

    const points = calculator.calculate({
      positions: [nasdaqEtf],
      historyByTicker: new Map([["CNDX.L", etfHistory]]),
      exchangeRateHistoryByCurrency: new Map([["USD", usdExchangeRateHistory]]),
      range: "1m",
    });

    expect(points).toHaveLength(2);
    expect(points[0].total).toBeCloseTo(nasdaqEtf.units * closeInUsdOnDay1 * exchangeRateOnDay1);
    expect(points[1].total).toBeCloseTo(nasdaqEtf.units * closeInUsdOnDay2 * exchangeRateOnDay2);
    expect(points[0].total).not.toBeCloseTo(points[1].total);
  });

  it("should add the constant cash total to every bucket", () => {
    const nasdaqEtf = etfPosition({ units: 2 });
    const cash = cashPosition(500);
    const etfCloseOnDay1 = 10;
    const etfCloseOnDay2 = 11;

    const etfHistory: AssetPriceHistory = {
      ticker: "CNDX.L",
      currency: "EUR",
      gmtOffsetSeconds: 0,
      points: [
        { timestamp: day1, close: etfCloseOnDay1 },
        { timestamp: day2, close: etfCloseOnDay2 },
      ],
    };

    const points = calculator.calculate({
      positions: [nasdaqEtf, cash],
      historyByTicker: new Map([["CNDX.L", etfHistory]]),
      exchangeRateHistoryByCurrency: new Map(),
      range: "1m",
    });

    expect(points[0].total).toBe(cash.units + nasdaqEtf.units * etfCloseOnDay1);
    expect(points[1].total).toBe(cash.units + nasdaqEtf.units * etfCloseOnDay2);
  });

  it("should hold a fund's single-point history flat across the whole axis", () => {
    const worldFund = { id: "world", name: "Fidelity MSCI World", ticker: "0P0001CLDK.F", type: "fondo" as const, units: 30, price: 14, group: "rv" as const };
    const bitcoin = cryptoPosition({ units: 1 });
    const fundCurrentPrice = 14;
    const btcCloseOnDay1 = 100;
    const btcCloseOnDay2 = 110;
    const btcCloseOnDay3 = 120;

    const fundHistory: AssetPriceHistory = {
      ticker: "0P0001CLDK.F",
      currency: "EUR",
      gmtOffsetSeconds: 0,
      points: [{ timestamp: day2, close: fundCurrentPrice }],
    };
    const btcHistory: AssetPriceHistory = {
      ticker: "BTC-EUR",
      currency: "EUR",
      gmtOffsetSeconds: 0,
      points: [
        { timestamp: day1, close: btcCloseOnDay1 },
        { timestamp: day2, close: btcCloseOnDay2 },
        { timestamp: day3, close: btcCloseOnDay3 },
      ],
    };

    const points = calculator.calculate({
      positions: [worldFund, bitcoin],
      historyByTicker: new Map([["0P0001CLDK.F", fundHistory], ["BTC-EUR", btcHistory]]),
      exchangeRateHistoryByCurrency: new Map(),
      range: "1m",
    });

    expect(points).toHaveLength(3);
    expect(points[0].total).toBe(worldFund.units * fundCurrentPrice + bitcoin.units * btcCloseOnDay1);
    expect(points[1].total).toBe(worldFund.units * fundCurrentPrice + bitcoin.units * btcCloseOnDay2);
    expect(points[2].total).toBe(worldFund.units * fundCurrentPrice + bitcoin.units * btcCloseOnDay3);
  });

  it("should contribute a constant units × current price for a priceable position the gateway could not resolve at all", () => {
    const bitcoin = cryptoPosition({ units: 1 });
    const unresolvedEtf = etfPosition({ units: 3, price: 900 });
    const btcCloseOnDay1 = 100;
    const btcCloseOnDay2 = 110;

    const btcHistory: AssetPriceHistory = {
      ticker: "BTC-EUR",
      currency: "EUR",
      gmtOffsetSeconds: 0,
      points: [
        { timestamp: day1, close: btcCloseOnDay1 },
        { timestamp: day2, close: btcCloseOnDay2 },
      ],
    };

    const points = calculator.calculate({
      positions: [bitcoin, unresolvedEtf],
      historyByTicker: new Map([["BTC-EUR", btcHistory]]),
      exchangeRateHistoryByCurrency: new Map(),
      range: "1m",
    });

    const unresolvedEtfConstantContribution = unresolvedEtf.units * unresolvedEtf.price;
    expect(points[0].total).toBe(bitcoin.units * btcCloseOnDay1 + unresolvedEtfConstantContribution);
    expect(points[1].total).toBe(bitcoin.units * btcCloseOnDay2 + unresolvedEtfConstantContribution);
  });

  it("should return an empty series when no history could be resolved for any instrument", () => {
    const nasdaqEtf = etfPosition();

    const points = calculator.calculate({
      positions: [nasdaqEtf],
      historyByTicker: new Map(),
      exchangeRateHistoryByCurrency: new Map(),
      range: "1m",
    });

    expect(points).toEqual([]);
  });
});
