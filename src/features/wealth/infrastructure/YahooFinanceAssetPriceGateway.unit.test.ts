import { afterEach, describe, expect, it, vi } from "vitest";
import { YahooFinanceAssetPriceGateway } from "@/features/wealth/infrastructure/YahooFinanceAssetPriceGateway";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

function chartResponseFor(regularMarketPrice: number, currency: string, regularMarketTime: number): unknown {
  return {
    chart: {
      result: [{ meta: { regularMarketPrice, currency, regularMarketTime } }],
      error: null,
    },
  };
}

describe("YahooFinanceAssetPriceGateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should request the per-symbol chart endpoint with the encoded ticker", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(chartResponseFor(25, "EUR", 1751500000)));
    vi.stubGlobal("fetch", fetchMock);
    const gateway = new YahooFinanceAssetPriceGateway();

    await gateway.fetchPrices(["0P0000KSPA.F"]);

    const [requestedUrl, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestedUrl).toBe(
      "https://query1.finance.yahoo.com/v8/finance/chart/0P0000KSPA.F?interval=1d&range=1d",
    );
    expect((requestOptions.headers as Record<string, string>)["User-Agent"]).toContain("Mozilla");
  });

  it("should map meta.regularMarketPrice, meta.currency and meta.regularMarketTime into an AssetPrice", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(chartResponseFor(1024.86, "USD", 1751500000))));
    const gateway = new YahooFinanceAssetPriceGateway();

    const prices = await gateway.fetchPrices(["CNDX.L"]);

    expect(prices).toEqual([{
      ticker: "CNDX.L",
      price: 1024.86,
      currency: "USD",
      asOf: new Date(1751500000 * 1000).toISOString(),
    }]);
  });

  it("should drop a ticker whose response carries a chart.error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ chart: { result: null, error: { code: "Not Found" } } })));
    const gateway = new YahooFinanceAssetPriceGateway();

    const prices = await gateway.fetchPrices(["UNKNOWN.TICKER"]);

    expect(prices).toEqual([]);
  });

  it("should drop a ticker whose fetch rejects, without failing the whole batch", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(jsonResponse(chartResponseFor(50000, "EUR", 1751500000)));
    vi.stubGlobal("fetch", fetchMock);
    const gateway = new YahooFinanceAssetPriceGateway();

    const prices = await gateway.fetchPrices(["BROKEN.TICKER", "BTC-EUR"]);

    expect(prices).toEqual([{
      ticker: "BTC-EUR",
      price: 50000,
      currency: "EUR",
      asOf: new Date(1751500000 * 1000).toISOString(),
    }]);
  });

  it("should drop a ticker when the HTTP response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));
    const gateway = new YahooFinanceAssetPriceGateway();

    const prices = await gateway.fetchPrices(["RATE-LIMITED.TICKER"]);

    expect(prices).toEqual([]);
  });
});
