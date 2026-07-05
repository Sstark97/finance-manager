import { describe, expect, it } from "vitest";
import { RefreshPositionPrices } from "@/features/wealth/application/RefreshPositionPrices";
import type { AssetPriceGateway } from "@/features/wealth/application/AssetPriceGateway";
import type { AssetPrice } from "@/features/wealth/domain/AssetPrice";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Position } from "@/features/wealth/domain/types";

class FakeAssetPriceGateway implements AssetPriceGateway {
  constructor(private readonly quotesByTicker: Map<string, AssetPrice>) {}

  async fetchPrices(tickers: string[]): Promise<AssetPrice[]> {
    return tickers
      .map((ticker) => this.quotesByTicker.get(ticker))
      .filter((quote): quote is AssetPrice => quote !== undefined);
  }
}

describe("RefreshPositionPrices", () => {
  const worldFund: Position = {
    id: "world", name: "Fidelity MSCI World", ticker: "0P0000KSPA.F",
    type: "fondo", units: 10, price: 20, group: "rv",
  };
  const nasdaqEtf: Position = {
    id: "nasdaq", name: "iShares Nasdaq 100", ticker: "CNDX.L",
    type: "etf", units: 2, price: 1024.86, group: "rv",
  };
  const bitcoin: Position = {
    id: "btc", name: "Bitcoin", ticker: "BTC-EUR",
    type: "cripto", units: 0.01, price: 50000, group: "btc",
  };
  const cash: Position = {
    id: "liquidez", name: "Fondo emergencia", ticker: "",
    type: "efectivo", units: 300, price: 1, group: "liquidez",
  };

  it("should merge fresh prices into the matching positions", async () => {
    const gateway = new FakeAssetPriceGateway(new Map([
      ["0P0000KSPA.F", { ticker: "0P0000KSPA.F", price: 25, currency: "EUR", asOf: "2026-07-05T00:00:00.000Z" }],
    ]));
    const useCase = new RefreshPositionPrices(gateway, new PortfolioCalculator());

    const result = await useCase.invoke([worldFund]);

    expect(result.positions[0].price).toBe(25);
  });

  it("should leave efectivo positions untouched since they are not priceable", async () => {
    const gateway = new FakeAssetPriceGateway(new Map());
    const useCase = new RefreshPositionPrices(gateway, new PortfolioCalculator());

    const result = await useCase.invoke([cash]);

    expect(result.positions[0]).toEqual(cash);
    expect(result.failedTickers).toEqual([]);
  });

  it("should record an unresolved priceable ticker in failedTickers and keep its previous price", async () => {
    const gateway = new FakeAssetPriceGateway(new Map());
    const useCase = new RefreshPositionPrices(gateway, new PortfolioCalculator());

    const result = await useCase.invoke([worldFund]);

    expect(result.failedTickers).toEqual(["0P0000KSPA.F"]);
    expect(result.positions[0].price).toBe(worldFund.price);
  });

  it("should compute total using PortfolioCalculator over the refreshed positions", async () => {
    const gateway = new FakeAssetPriceGateway(new Map([
      ["0P0000KSPA.F", { ticker: "0P0000KSPA.F", price: 25, currency: "EUR", asOf: "2026-07-05T00:00:00.000Z" }],
    ]));
    const useCase = new RefreshPositionPrices(gateway, new PortfolioCalculator());

    const result = await useCase.invoke([worldFund, bitcoin, cash]);

    const expectedTotal = new PortfolioCalculator().derive(result.positions).total;
    expect(result.total).toBe(expectedTotal);
  });

  it("should convert a non-EUR quote to EUR using an exchange rate fetched from the same gateway", async () => {
    const gateway = new FakeAssetPriceGateway(new Map([
      ["CNDX.L", { ticker: "CNDX.L", price: 100, currency: "USD", asOf: "2026-07-05T00:00:00.000Z" }],
      ["USDEUR=X", { ticker: "USDEUR=X", price: 0.9, currency: "EUR", asOf: "2026-07-05T00:00:00.000Z" }],
    ]));
    const useCase = new RefreshPositionPrices(gateway, new PortfolioCalculator());

    const result = await useCase.invoke([nasdaqEtf]);

    expect(result.positions[0].price).toBeCloseTo(90);
    expect(result.failedTickers).toEqual([]);
  });

  it("should mark a non-EUR ticker as failed when its exchange rate cannot be resolved", async () => {
    const gateway = new FakeAssetPriceGateway(new Map([
      ["CNDX.L", { ticker: "CNDX.L", price: 100, currency: "USD", asOf: "2026-07-05T00:00:00.000Z" }],
    ]));
    const useCase = new RefreshPositionPrices(gateway, new PortfolioCalculator());

    const result = await useCase.invoke([nasdaqEtf]);

    expect(result.failedTickers).toEqual(["CNDX.L"]);
    expect(result.positions[0].price).toBe(nasdaqEtf.price);
  });
});
