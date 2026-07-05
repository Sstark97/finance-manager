import type { Position } from "@/features/wealth/domain/types";
import type { AssetPrice } from "@/features/wealth/domain/AssetPrice";
import type { AssetPriceGateway } from "@/features/wealth/application/AssetPriceGateway";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";

export interface PositionPricingResult {
  positions: Position[];
  total: number;
  failedTickers: string[];
}

export interface RefreshPositionPricesUseCase {
  invoke(positions: Position[]): Promise<PositionPricingResult>;
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

export class RefreshPositionPrices implements RefreshPositionPricesUseCase {
  constructor(
    private readonly assetPrices: AssetPriceGateway,
    private readonly portfolioCalculator: PortfolioCalculator,
  ) {}

  async invoke(positions: Position[]): Promise<PositionPricingResult> {
    const priceablePositions = positions.filter(isPriceable);
    const priceableTickers = priceablePositions.map((position) => position.ticker);
    const quotes = await this.assetPrices.fetchPrices(priceableTickers);
    const quoteByTicker = new Map(quotes.map((quote) => [quote.ticker, quote]));
    const exchangeRateByCurrency = await this.fetchExchangeRatesFor(quotes);

    const failedTickers: string[] = [];
    const refreshedPositions = positions.map((position) =>
      this.refreshPosition(position, quoteByTicker, exchangeRateByCurrency, failedTickers),
    );

    const total = this.portfolioCalculator.derive(refreshedPositions).total;

    return { positions: refreshedPositions, total, failedTickers };
  }

  private refreshPosition(
    position: Position,
    quoteByTicker: Map<string, AssetPrice>,
    exchangeRateByCurrency: Map<string, number>,
    failedTickers: string[],
  ): Position {
    if (!isPriceable(position)) return position;

    const quote = quoteByTicker.get(position.ticker);
    if (!quote) {
      failedTickers.push(position.ticker);
      return position;
    }

    const euroPrice = this.toEuroPrice(quote, exchangeRateByCurrency);
    if (euroPrice === null) {
      failedTickers.push(position.ticker);
      return position;
    }

    return { ...position, price: euroPrice };
  }

  private async fetchExchangeRatesFor(quotes: AssetPrice[]): Promise<Map<string, number>> {
    const foreignCurrencies = Array.from(
      new Set(quotes.filter((quote) => quote.currency !== EURO_CURRENCY).map((quote) => quote.currency)),
    );
    if (foreignCurrencies.length === 0) return new Map();

    const exchangeRateQuotes = await this.assetPrices.fetchPrices(
      foreignCurrencies.map(toExchangeRateTicker),
    );
    return new Map(
      exchangeRateQuotes.map((quote) => [toCurrencyFromExchangeRateTicker(quote.ticker), quote.price]),
    );
  }

  private toEuroPrice(quote: AssetPrice, exchangeRateByCurrency: Map<string, number>): number | null {
    if (quote.currency === EURO_CURRENCY) return quote.price;
    const exchangeRate = exchangeRateByCurrency.get(quote.currency);
    return exchangeRate === undefined ? null : quote.price * exchangeRate;
  }
}
