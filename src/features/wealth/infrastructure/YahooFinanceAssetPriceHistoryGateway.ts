import type { AssetPriceHistoryGateway } from "@/features/wealth/application/AssetPriceHistoryGateway";
import type { AssetPriceHistory, AssetPricePoint } from "@/features/wealth/domain/AssetPriceHistory";
import type { HistoryRange } from "@/features/wealth/domain/HistoryRange";

const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart";
const BROWSER_LIKE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const YAHOO_RANGE_PARAMETERS: Record<HistoryRange, { interval: string; range: string }> = {
  "1d": { interval: "5m", range: "1d" },
  "1w": { interval: "1d", range: "5d" },
  "1m": { interval: "1d", range: "1mo" },
  "ytd": { interval: "1d", range: "ytd" },
  "1y": { interval: "1wk", range: "1y" },
};

interface YahooChartHistoryMeta {
  currency?: string;
  gmtoffset?: number;
  regularMarketPrice?: number;
  regularMarketTime?: number;
}

interface YahooChartHistoryResult {
  meta: YahooChartHistoryMeta;
  timestamp?: number[];
  indicators: {
    quote?: Array<{ close?: Array<number | null> }>;
    adjclose?: Array<{ adjclose?: Array<number | null> }>;
  };
}

interface YahooChartHistoryResponse {
  chart: {
    result: YahooChartHistoryResult[] | null;
    error: unknown;
  };
}

export class YahooFinanceAssetPriceHistoryGateway implements AssetPriceHistoryGateway {
  async fetchHistories(tickers: string[], range: HistoryRange): Promise<AssetPriceHistory[]> {
    const { interval, range: yahooRange } = YAHOO_RANGE_PARAMETERS[range];
    const settledHistories = await Promise.allSettled(
      tickers.map((ticker) => this.fetchHistory(ticker, interval, yahooRange)),
    );
    return settledHistories
      .filter((settled): settled is PromiseFulfilledResult<AssetPriceHistory | null> => settled.status === "fulfilled")
      .map((settled) => settled.value)
      .filter((history): history is AssetPriceHistory => history !== null);
  }

  private async fetchHistory(ticker: string, interval: string, yahooRange: string): Promise<AssetPriceHistory | null> {
    const response = await fetch(
      `${YAHOO_CHART_ENDPOINT}/${encodeURIComponent(ticker)}?interval=${interval}&range=${yahooRange}`,
      { headers: { "User-Agent": BROWSER_LIKE_USER_AGENT } },
    );
    if (!response.ok) return null;

    const chartResponse = (await response.json()) as YahooChartHistoryResponse;
    return this.toAssetPriceHistory(ticker, chartResponse);
  }

  private toAssetPriceHistory(ticker: string, chartResponse: YahooChartHistoryResponse): AssetPriceHistory | null {
    if (chartResponse.chart.error) return null;

    const result = chartResponse.chart.result?.[0];
    if (!result || result.meta.currency === undefined) return null;

    const gmtOffsetSeconds = result.meta.gmtoffset ?? 0;
    const points = this.zipTimestampsAndCloses(result);
    if (points.length > 0) {
      return { ticker, currency: result.meta.currency, gmtOffsetSeconds, points };
    }

    const fundFallbackPoint = this.fundFallbackPointFor(result.meta);
    if (!fundFallbackPoint) return null;
    return { ticker, currency: result.meta.currency, gmtOffsetSeconds, points: [fundFallbackPoint] };
  }

  private zipTimestampsAndCloses(result: YahooChartHistoryResult): AssetPricePoint[] {
    const timestamps = result.timestamp ?? [];
    const closes = result.indicators.quote?.[0]?.close ?? result.indicators.adjclose?.[0]?.adjclose ?? [];

    const points: AssetPricePoint[] = [];
    timestamps.forEach((timestamp, index) => {
      const close = closes[index];
      if (close !== null && close !== undefined) points.push({ timestamp, close });
    });
    return points;
  }

  private fundFallbackPointFor(meta: YahooChartHistoryMeta): AssetPricePoint | null {
    if (meta.regularMarketPrice === undefined) return null;
    const timestamp = meta.regularMarketTime ?? Math.floor(Date.now() / 1000);
    return { timestamp, close: meta.regularMarketPrice };
  }
}
