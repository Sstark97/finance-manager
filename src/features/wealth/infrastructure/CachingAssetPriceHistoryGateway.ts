import type { AssetPriceHistoryGateway } from "@/features/wealth/application/AssetPriceHistoryGateway";
import type { AssetPriceHistory } from "@/features/wealth/domain/AssetPriceHistory";
import type { HistoryRange } from "@/features/wealth/domain/HistoryRange";

interface CacheEntry {
  assetPriceHistory: AssetPriceHistory;
  expiresAt: number;
}

const DEFAULT_TTL_MILLISECONDS = 6 * 60 * 60 * 1000;

function toCacheKey(ticker: string, range: HistoryRange): string {
  return `${ticker}|${range}`;
}

export class CachingAssetPriceHistoryGateway implements AssetPriceHistoryGateway {
  private readonly cacheByKey = new Map<string, CacheEntry>();

  constructor(
    private readonly delegate: AssetPriceHistoryGateway,
    private readonly ttlMilliseconds: number = DEFAULT_TTL_MILLISECONDS,
  ) {}

  async fetchHistories(tickers: string[], range: HistoryRange): Promise<AssetPriceHistory[]> {
    const freshFromCache = tickers
      .map((ticker) => this.cacheByKey.get(toCacheKey(ticker, range)))
      .filter((entry): entry is CacheEntry => entry !== undefined && entry.expiresAt > Date.now())
      .map((entry) => entry.assetPriceHistory);

    const staleOrMissingTickers = tickers.filter((ticker) => !this.hasFreshEntry(ticker, range));
    if (staleOrMissingTickers.length === 0) return freshFromCache;

    const fetchedHistories = await this.delegate.fetchHistories(staleOrMissingTickers, range);
    fetchedHistories.forEach((assetPriceHistory) => {
      this.cacheByKey.set(toCacheKey(assetPriceHistory.ticker, range), {
        assetPriceHistory,
        expiresAt: Date.now() + this.ttlMilliseconds,
      });
    });

    return [...freshFromCache, ...fetchedHistories];
  }

  private hasFreshEntry(ticker: string, range: HistoryRange): boolean {
    const entry = this.cacheByKey.get(toCacheKey(ticker, range));
    return entry !== undefined && entry.expiresAt > Date.now();
  }
}
