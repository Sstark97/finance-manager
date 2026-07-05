import type { AssetPriceGateway } from "@/features/wealth/application/AssetPriceGateway";
import type { AssetPrice } from "@/features/wealth/domain/AssetPrice";

const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart";
const BROWSER_LIKE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice?: number;
        currency?: string;
        regularMarketTime?: number;
      };
    }> | null;
    error: unknown;
  };
}

export class YahooFinanceAssetPriceGateway implements AssetPriceGateway {
  async fetchPrices(tickers: string[]): Promise<AssetPrice[]> {
    const settledQuotes = await Promise.allSettled(tickers.map((ticker) => this.fetchPrice(ticker)));
    return settledQuotes
      .filter((settledQuote): settledQuote is PromiseFulfilledResult<AssetPrice | null> => settledQuote.status === "fulfilled")
      .map((settledQuote) => settledQuote.value)
      .filter((quote): quote is AssetPrice => quote !== null);
  }

  private async fetchPrice(ticker: string): Promise<AssetPrice | null> {
    const response = await fetch(`${YAHOO_CHART_ENDPOINT}/${encodeURIComponent(ticker)}?interval=1d&range=1d`, {
      headers: { "User-Agent": BROWSER_LIKE_USER_AGENT },
    });
    if (!response.ok) return null;

    const chartResponse = (await response.json()) as YahooChartResponse;
    return this.toAssetPrice(ticker, chartResponse);
  }

  private toAssetPrice(ticker: string, chartResponse: YahooChartResponse): AssetPrice | null {
    if (chartResponse.chart.error) return null;

    const meta = chartResponse.chart.result?.[0]?.meta;
    if (!meta || meta.regularMarketPrice === undefined || meta.currency === undefined) return null;

    const asOf = meta.regularMarketTime !== undefined
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString();

    return { ticker, price: meta.regularMarketPrice, currency: meta.currency, asOf };
  }
}
