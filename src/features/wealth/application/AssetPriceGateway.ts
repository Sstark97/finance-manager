import type { AssetPrice } from "@/features/wealth/domain/AssetPrice";

export interface AssetPriceGateway {
  fetchPrices(tickers: string[]): Promise<AssetPrice[]>;
}
