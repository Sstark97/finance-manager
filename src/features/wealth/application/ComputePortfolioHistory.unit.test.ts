import { describe, expect, it } from "vitest";
import { ComputePortfolioHistory } from "@/features/wealth/application/ComputePortfolioHistory";
import type { AssetPriceHistoryGateway } from "@/features/wealth/application/AssetPriceHistoryGateway";
import type { AssetPriceHistory } from "@/features/wealth/domain/AssetPriceHistory";
import { PortfolioHistoryCalculator } from "@/features/wealth/domain/PortfolioHistoryCalculator";
import type { Position } from "@/features/wealth/domain/types";

class FakeAssetPriceHistoryGateway implements AssetPriceHistoryGateway {
  requestedTickersByCall: string[][] = [];

  constructor(private readonly historyByTicker: Map<string, AssetPriceHistory>) {}

  async fetchHistories(tickers: string[]): Promise<AssetPriceHistory[]> {
    this.requestedTickersByCall.push(tickers);
    return tickers
      .map((ticker) => this.historyByTicker.get(ticker))
      .filter((history): history is AssetPriceHistory => history !== undefined);
  }
}

const day1 = Date.UTC(2026, 6, 1, 0, 0, 0) / 1000;
const day2 = Date.UTC(2026, 6, 2, 0, 0, 0) / 1000;

const nasdaqEtf: Position = { id: "nasdaq", name: "iShares Nasdaq 100", ticker: "CNDX.L", type: "etf", units: 2, price: 1000, group: "rv" };
const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 1, price: 100, group: "btc" };
const cash: Position = { id: "liquidez", name: "Fondo emergencia", ticker: "", type: "efectivo", units: 300, price: 1, group: "liquidez" };

describe("ComputePortfolioHistory", () => {
  it("should request histories for the priceable tickers at the requested range", async () => {
    const gateway = new FakeAssetPriceHistoryGateway(new Map());
    const useCase = new ComputePortfolioHistory(gateway, new PortfolioHistoryCalculator());

    await useCase.invoke([nasdaqEtf, bitcoin, cash], "1m");

    expect(gateway.requestedTickersByCall[0]).toEqual(["CNDX.L", "BTC-EUR"]);
  });

  it("should request an exchange-rate history when a resolved history reports a non-EUR currency", async () => {
    const usdHistory: AssetPriceHistory = {
      ticker: "CNDX.L",
      currency: "USD",
      gmtOffsetSeconds: 3600,
      points: [{ timestamp: day1, close: 100 }],
    };
    const gateway = new FakeAssetPriceHistoryGateway(new Map([["CNDX.L", usdHistory]]));
    const useCase = new ComputePortfolioHistory(gateway, new PortfolioHistoryCalculator());

    await useCase.invoke([nasdaqEtf], "1m");

    expect(gateway.requestedTickersByCall[1]).toEqual(["USDEUR=X"]);
  });

  it("should not request any exchange-rate history when every resolved instrument is already in EUR", async () => {
    const eurHistory: AssetPriceHistory = {
      ticker: "BTC-EUR",
      currency: "EUR",
      gmtOffsetSeconds: 0,
      points: [{ timestamp: day1, close: 100 }],
    };
    const gateway = new FakeAssetPriceHistoryGateway(new Map([["BTC-EUR", eurHistory]]));
    const useCase = new ComputePortfolioHistory(gateway, new PortfolioHistoryCalculator());

    await useCase.invoke([bitcoin], "1m");

    expect(gateway.requestedTickersByCall).toHaveLength(1);
  });

  it("should record a priceable ticker absent from the resolved histories as a failed ticker", async () => {
    const btcHistory: AssetPriceHistory = {
      ticker: "BTC-EUR",
      currency: "EUR",
      gmtOffsetSeconds: 0,
      points: [{ timestamp: day1, close: 100 }],
    };
    const gateway = new FakeAssetPriceHistoryGateway(new Map([["BTC-EUR", btcHistory]]));
    const useCase = new ComputePortfolioHistory(gateway, new PortfolioHistoryCalculator());

    const result = await useCase.invoke([nasdaqEtf, bitcoin], "1m");

    expect(result.failedTickers).toEqual(["CNDX.L"]);
  });

  it("should return the points computed by PortfolioHistoryCalculator over the assembled histories", async () => {
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
    const gateway = new FakeAssetPriceHistoryGateway(new Map([["BTC-EUR", btcHistory]]));
    const calculator = new PortfolioHistoryCalculator();
    const useCase = new ComputePortfolioHistory(gateway, calculator);

    const result = await useCase.invoke([bitcoin, cash], "1m");

    const expectedPoints = calculator.calculate({
      positions: [bitcoin, cash],
      historyByTicker: new Map([["BTC-EUR", btcHistory]]),
      exchangeRateHistoryByCurrency: new Map(),
      range: "1m",
    });
    expect(result.points).toEqual(expectedPoints);
  });
});
