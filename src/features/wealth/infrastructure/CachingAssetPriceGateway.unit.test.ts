import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CachingAssetPriceGateway } from "@/features/wealth/infrastructure/CachingAssetPriceGateway";
import type { AssetPriceGateway } from "@/features/wealth/application/AssetPriceGateway";
import type { AssetPrice } from "@/features/wealth/domain/AssetPrice";

class CountingAssetPriceGateway implements AssetPriceGateway {
  callCount = 0;
  lastRequestedTickers: string[] = [];

  async fetchPrices(tickers: string[]): Promise<AssetPrice[]> {
    this.callCount += 1;
    this.lastRequestedTickers = tickers;
    return tickers.map((ticker) => ({ ticker, price: 100, currency: "EUR", asOf: new Date().toISOString() }));
  }
}

describe("CachingAssetPriceGateway", () => {
  const ttlMilliseconds = 15 * 60 * 1000;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should serve a second request for the same ticker from cache within the TTL window, calling the delegate only once", async () => {
    const delegate = new CountingAssetPriceGateway();
    const gateway = new CachingAssetPriceGateway(delegate, ttlMilliseconds);

    await gateway.fetchPrices(["BTC-EUR"]);
    await gateway.fetchPrices(["BTC-EUR"]);

    expect(delegate.callCount).toBe(1);
  });

  it("should refetch a ticker once its cache entry expires past the TTL", async () => {
    const delegate = new CountingAssetPriceGateway();
    const gateway = new CachingAssetPriceGateway(delegate, ttlMilliseconds);

    await gateway.fetchPrices(["BTC-EUR"]);
    vi.advanceTimersByTime(ttlMilliseconds + 1);
    await gateway.fetchPrices(["BTC-EUR"]);

    expect(delegate.callCount).toBe(2);
  });

  it("should only refetch the stale or missing tickers, leaving fresh ones untouched", async () => {
    const delegate = new CountingAssetPriceGateway();
    const gateway = new CachingAssetPriceGateway(delegate, ttlMilliseconds);

    await gateway.fetchPrices(["BTC-EUR"]);
    vi.advanceTimersByTime(1000);
    const prices = await gateway.fetchPrices(["BTC-EUR", "CNDX.L"]);

    expect(delegate.callCount).toBe(2);
    expect(delegate.lastRequestedTickers).toEqual(["CNDX.L"]);
    expect(prices.map((price) => price.ticker).sort()).toEqual(["BTC-EUR", "CNDX.L"]);
  });
});
