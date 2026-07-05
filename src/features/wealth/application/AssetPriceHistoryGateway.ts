import type { AssetPriceHistory } from "@/features/wealth/domain/AssetPriceHistory";
import type { HistoryRange } from "@/features/wealth/domain/HistoryRange";

export interface AssetPriceHistoryGateway {
  // Batch by design (mirrors AssetPriceGateway.fetchPrices) so the caching decorator and
  // multi-symbol providers stay natural. Unknown/failed tickers are simply absent from the result.
  fetchHistories(tickers: string[], range: HistoryRange): Promise<AssetPriceHistory[]>;
}
