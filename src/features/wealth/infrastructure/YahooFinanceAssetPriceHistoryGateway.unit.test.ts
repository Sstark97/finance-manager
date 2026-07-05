import { afterEach, describe, expect, it, vi } from "vitest";
import { YahooFinanceAssetPriceHistoryGateway } from "@/features/wealth/infrastructure/YahooFinanceAssetPriceHistoryGateway";
import type { HistoryRange } from "@/features/wealth/domain/HistoryRange";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

function chartHistoryResponseFor(
  timestamps: number[],
  closes: Array<number | null>,
  currency: string,
  gmtoffset: number,
): unknown {
  return {
    chart: {
      result: [{
        meta: { currency, gmtoffset },
        timestamp: timestamps,
        indicators: { quote: [{ close: closes }] },
      }],
      error: null,
    },
  };
}

describe("YahooFinanceAssetPriceHistoryGateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["1d", "5m", "1d"],
    ["1w", "1d", "5d"],
    ["1m", "1d", "1mo"],
    ["ytd", "1d", "ytd"],
    ["1y", "1wk", "1y"],
  ] as Array<[HistoryRange, string, string]>)(
    "should request the %s chart range with interval=%s&range=%s",
    async (historyRange, expectedInterval, expectedRange) => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(chartHistoryResponseFor([1751500000], [100], "EUR", 0)));
      vi.stubGlobal("fetch", fetchMock);
      const gateway = new YahooFinanceAssetPriceHistoryGateway();

      await gateway.fetchHistories(["BTC-EUR"], historyRange);

      const [requestedUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(requestedUrl).toBe(
        `https://query1.finance.yahoo.com/v8/finance/chart/BTC-EUR?interval=${expectedInterval}&range=${expectedRange}`,
      );
    },
  );

  it("should zip timestamps and closes together with meta.currency and meta.gmtoffset", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      jsonResponse(chartHistoryResponseFor([1751500000, 1751586400], [100, 110], "USD", 3600)),
    ));
    const gateway = new YahooFinanceAssetPriceHistoryGateway();

    const histories = await gateway.fetchHistories(["CNDX.L"], "1m");

    expect(histories).toEqual([{
      ticker: "CNDX.L",
      currency: "USD",
      gmtOffsetSeconds: 3600,
      points: [
        { timestamp: 1751500000, close: 100 },
        { timestamp: 1751586400, close: 110 },
      ],
    }]);
  });

  it("should drop bars whose close is null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      jsonResponse(chartHistoryResponseFor([1751500000, 1751586400, 1751672800], [100, null, 120], "EUR", 0)),
    ));
    const gateway = new YahooFinanceAssetPriceHistoryGateway();

    const histories = await gateway.fetchHistories(["CNDX.L"], "1m");

    expect(histories[0].points).toEqual([
      { timestamp: 1751500000, close: 100 },
      { timestamp: 1751672800, close: 120 },
    ]);
  });

  it("should fall back to indicators.adjclose when indicators.quote.close is absent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      chart: {
        result: [{
          meta: { currency: "EUR", gmtoffset: 0 },
          timestamp: [1751500000],
          indicators: { adjclose: [{ adjclose: [55] }] },
        }],
        error: null,
      },
    })));
    const gateway = new YahooFinanceAssetPriceHistoryGateway();

    const histories = await gateway.fetchHistories(["CNDX.L"], "1m");

    expect(histories[0].points).toEqual([{ timestamp: 1751500000, close: 55 }]);
  });

  it("should emit a single synthetic point from meta.regularMarketPrice when the series is empty (fund case)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      chart: {
        result: [{
          meta: { currency: "EUR", gmtoffset: 0, regularMarketPrice: 8.9928, regularMarketTime: 1751500000 },
          timestamp: [],
          indicators: { quote: [{ close: [] }] },
        }],
        error: null,
      },
    })));
    const gateway = new YahooFinanceAssetPriceHistoryGateway();

    const histories = await gateway.fetchHistories(["FEP2.MU"], "1m");

    expect(histories).toEqual([{
      ticker: "FEP2.MU",
      currency: "EUR",
      gmtOffsetSeconds: 0,
      points: [{ timestamp: 1751500000, close: 8.9928 }],
    }]);
  });

  it("should drop a ticker whose response carries a chart.error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ chart: { result: null, error: { code: "Not Found" } } })));
    const gateway = new YahooFinanceAssetPriceHistoryGateway();

    const histories = await gateway.fetchHistories(["UNKNOWN.TICKER"], "1m");

    expect(histories).toEqual([]);
  });

  it("should drop a ticker when the HTTP response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));
    const gateway = new YahooFinanceAssetPriceHistoryGateway();

    const histories = await gateway.fetchHistories(["RATE-LIMITED.TICKER"], "1m");

    expect(histories).toEqual([]);
  });

  it("should drop a ticker whose fetch rejects, without failing the whole batch", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(jsonResponse(chartHistoryResponseFor([1751500000], [50000], "EUR", 0)));
    vi.stubGlobal("fetch", fetchMock);
    const gateway = new YahooFinanceAssetPriceHistoryGateway();

    const histories = await gateway.fetchHistories(["BROKEN.TICKER", "BTC-EUR"], "1m");

    expect(histories).toEqual([{
      ticker: "BTC-EUR",
      currency: "EUR",
      gmtOffsetSeconds: 0,
      points: [{ timestamp: 1751500000, close: 50000 }],
    }]);
  });
});
