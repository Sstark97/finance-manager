import type { AssetPriceGateway } from "@/features/wealth/application/AssetPriceGateway";
import type { AssetPrice } from "@/features/wealth/domain/AssetPrice";

interface CacheEntry {
  assetPrice: AssetPrice;
  expiresAt: number;
}

const DEFAULT_TTL_MILLISECONDS = 15 * 60 * 1000;

export class CachingAssetPriceGateway implements AssetPriceGateway {
  private readonly cacheByTicker = new Map<string, CacheEntry>();

  constructor(
    private readonly delegate: AssetPriceGateway,
    private readonly ttlMilliseconds: number = DEFAULT_TTL_MILLISECONDS,
  ) {}

  async fetchPrices(tickers: string[]): Promise<AssetPrice[]> {
    const freshFromCache = tickers
      .map((ticker) => this.cacheByTicker.get(ticker))
      .filter((entry): entry is CacheEntry => entry !== undefined && entry.expiresAt > Date.now())
      .map((entry) => entry.assetPrice);

    const staleOrMissingTickers = tickers.filter((ticker) => !this.hasFreshEntry(ticker));
    if (staleOrMissingTickers.length === 0) return freshFromCache;

    const fetchedPrices = await this.delegate.fetchPrices(staleOrMissingTickers);
    fetchedPrices.forEach((assetPrice) => {
      this.cacheByTicker.set(assetPrice.ticker, { assetPrice, expiresAt: Date.now() + this.ttlMilliseconds });
    });

    return [...freshFromCache, ...fetchedPrices];
  }

  private hasFreshEntry(ticker: string): boolean {
    const entry = this.cacheByTicker.get(ticker);
    return entry !== undefined && entry.expiresAt > Date.now();
  }
}
