import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CachingAssetPriceHistoryGateway } from "@/features/wealth/infrastructure/CachingAssetPriceHistoryGateway";
import type { AssetPriceHistoryGateway } from "@/features/wealth/application/AssetPriceHistoryGateway";
import type { AssetPriceHistory } from "@/features/wealth/domain/AssetPriceHistory";

class CountingAssetPriceHistoryGateway implements AssetPriceHistoryGateway {
  callCount = 0;
  lastRequestedTickers: string[] = [];

  async fetchHistories(tickers: string[]): Promise<AssetPriceHistory[]> {
    this.callCount += 1;
    this.lastRequestedTickers = tickers;
    return tickers.map((ticker) => ({ ticker, currency: "EUR", gmtOffsetSeconds: 0, points: [{ timestamp: 0, close: 100 }] }));
  }
}

describe("CachingAssetPriceHistoryGateway", () => {
  const ttlMilliseconds = 6 * 60 * 60 * 1000;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should serve a second request for the same ticker and range from cache within the TTL window, calling the delegate only once", async () => {
    const delegate = new CountingAssetPriceHistoryGateway();
    const gateway = new CachingAssetPriceHistoryGateway(delegate, ttlMilliseconds);

    await gateway.fetchHistories(["BTC-EUR"], "1m");
    await gateway.fetchHistories(["BTC-EUR"], "1m");

    expect(delegate.callCount).toBe(1);
  });

  it("should refetch a ticker once its cache entry expires past the TTL", async () => {
    const delegate = new CountingAssetPriceHistoryGateway();
    const gateway = new CachingAssetPriceHistoryGateway(delegate, ttlMilliseconds);

    await gateway.fetchHistories(["BTC-EUR"], "1m");
    vi.advanceTimersByTime(ttlMilliseconds + 1);
    await gateway.fetchHistories(["BTC-EUR"], "1m");

    expect(delegate.callCount).toBe(2);
  });

  it("should refetch the same ticker when a different range is requested, since the cache key includes the range", async () => {
    const delegate = new CountingAssetPriceHistoryGateway();
    const gateway = new CachingAssetPriceHistoryGateway(delegate, ttlMilliseconds);

    await gateway.fetchHistories(["BTC-EUR"], "1m");
    await gateway.fetchHistories(["BTC-EUR"], "1y");

    expect(delegate.callCount).toBe(2);
  });

  it("should only refetch the stale or missing (ticker, range) pairs, leaving fresh ones untouched", async () => {
    const delegate = new CountingAssetPriceHistoryGateway();
    const gateway = new CachingAssetPriceHistoryGateway(delegate, ttlMilliseconds);

    await gateway.fetchHistories(["BTC-EUR"], "1m");
    vi.advanceTimersByTime(1000);
    const histories = await gateway.fetchHistories(["BTC-EUR", "CNDX.L"], "1m");

    expect(delegate.callCount).toBe(2);
    expect(delegate.lastRequestedTickers).toEqual(["CNDX.L"]);
    expect(histories.map((history) => history.ticker).sort()).toEqual(["BTC-EUR", "CNDX.L"]);
  });
});
