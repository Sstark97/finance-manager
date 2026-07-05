import type { Position, PortfolioHistoryPoint } from "@/features/wealth/domain/types";
import type { HistoryRange } from "@/features/wealth/domain/HistoryRange";
import type { AssetPriceHistory } from "@/features/wealth/domain/AssetPriceHistory";
import type { AssetPriceHistoryGateway } from "@/features/wealth/application/AssetPriceHistoryGateway";
import { PortfolioHistoryCalculator } from "@/features/wealth/domain/PortfolioHistoryCalculator";

export interface PortfolioHistoryResult {
  points: PortfolioHistoryPoint[];
  failedTickers: string[]; // priceable tickers the provider returned no history for
}

export interface ComputePortfolioHistoryUseCase {
  invoke(positions: Position[], range: HistoryRange): Promise<PortfolioHistoryResult>;
}

const EURO_CURRENCY = "EUR";

function isPriceable(position: Position): boolean {
  return position.type !== "efectivo" && position.ticker !== "";
}

function toExchangeRateTicker(currency: string): string {
  return `${currency}${EURO_CURRENCY}=X`;
}

function toCurrencyFromExchangeRateTicker(ticker: string): string {
  return ticker.replace(`${EURO_CURRENCY}=X`, "");
}

export class ComputePortfolioHistory implements ComputePortfolioHistoryUseCase {
  constructor(
    private readonly assetPriceHistory: AssetPriceHistoryGateway,
    private readonly portfolioHistoryCalculator: PortfolioHistoryCalculator,
  ) {}

  async invoke(positions: Position[], range: HistoryRange): Promise<PortfolioHistoryResult> {
    const priceableTickers = positions.filter(isPriceable).map((position) => position.ticker);
    const histories = await this.assetPriceHistory.fetchHistories(priceableTickers, range);
    const historyByTicker = new Map(histories.map((history) => [history.ticker, history]));
    const failedTickers = priceableTickers.filter((ticker) => !historyByTicker.has(ticker));

    const exchangeRateHistoryByCurrency = await this.fetchExchangeRateHistoriesFor(histories, range);

    const points = this.portfolioHistoryCalculator.calculate({
      positions,
      historyByTicker,
      exchangeRateHistoryByCurrency,
      range,
    });

    return { points, failedTickers };
  }

  private async fetchExchangeRateHistoriesFor(
    histories: AssetPriceHistory[],
    range: HistoryRange,
  ): Promise<Map<string, AssetPriceHistory>> {
    const foreignCurrencies = Array.from(
      new Set(histories.filter((history) => history.currency !== EURO_CURRENCY).map((history) => history.currency)),
    );
    if (foreignCurrencies.length === 0) return new Map();

    const exchangeRateHistories = await this.assetPriceHistory.fetchHistories(
      foreignCurrencies.map(toExchangeRateTicker),
      range,
    );
    return new Map(
      exchangeRateHistories.map((history) => [toCurrencyFromExchangeRateTicker(history.ticker), history]),
    );
  }
}
