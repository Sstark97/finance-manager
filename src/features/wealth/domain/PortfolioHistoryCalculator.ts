import type { Position, PortfolioHistoryPoint } from "@/features/wealth/domain/types";
import type { AssetPriceHistory, AssetPricePoint } from "@/features/wealth/domain/AssetPriceHistory";
import type { HistoryRange } from "@/features/wealth/domain/HistoryRange";
import { HISTORY_RANGE_SPECS } from "@/features/wealth/domain/HistoryRange";
import { HistoryBucketer } from "@/features/wealth/domain/HistoryBucketer";
import { ForwardFilledSeries } from "@/features/wealth/domain/ForwardFilledSeries";

export interface PortfolioHistoryInputs {
  positions: Position[];
  historyByTicker: Map<string, AssetPriceHistory>;              // priceable ticker -> its history
  exchangeRateHistoryByCurrency: Map<string, AssetPriceHistory>; // e.g. "USD" -> USDEUR=X history
  range: HistoryRange;
}

interface PriceableSeries {
  priceSeries: ForwardFilledSeries;
  exchangeRateSeries: ForwardFilledSeries;
}

const EURO_CURRENCY = "EUR";
const CONSTANT_EXCHANGE_RATE_OF_ONE = 1;

function isCash(position: Position): boolean {
  return position.type === "efectivo";
}

function isPriceable(position: Position): boolean {
  return position.type !== "efectivo" && position.ticker !== "";
}

export class PortfolioHistoryCalculator {
  calculate(inputs: PortfolioHistoryInputs): PortfolioHistoryPoint[] {
    const cashTotal = this.cashTotalOf(inputs.positions);
    const priceablePositions = inputs.positions.filter(isPriceable);
    const bucketer = new HistoryBucketer(HISTORY_RANGE_SPECS[inputs.range]);

    const masterAxis = this.masterAxisFor(inputs.historyByTicker, bucketer);
    if (masterAxis.length === 0) return [];

    const priceableSeriesByTicker = this.buildPriceableSeriesByTicker(
      priceablePositions,
      inputs.historyByTicker,
      inputs.exchangeRateHistoryByCurrency,
      bucketer,
    );

    return masterAxis.map((bucketKey) => ({
      label: bucketer.labelFor(bucketKey),
      total: this.totalAtBucket(bucketKey, cashTotal, priceablePositions, priceableSeriesByTicker),
    }));
  }

  private cashTotalOf(positions: Position[]): number {
    return positions.filter(isCash).reduce((sum, position) => sum + position.units, 0);
  }

  private masterAxisFor(historyByTicker: Map<string, AssetPriceHistory>, bucketer: HistoryBucketer): number[] {
    const bucketKeys = new Set<number>();
    historyByTicker.forEach((history) => {
      history.points.forEach((point) => {
        bucketKeys.add(bucketer.bucketKeyFor(point.timestamp, history.gmtOffsetSeconds));
      });
    });
    return Array.from(bucketKeys).sort((firstBucketKey, secondBucketKey) => firstBucketKey - secondBucketKey);
  }

  private buildPriceableSeriesByTicker(
    priceablePositions: Position[],
    historyByTicker: Map<string, AssetPriceHistory>,
    exchangeRateHistoryByCurrency: Map<string, AssetPriceHistory>,
    bucketer: HistoryBucketer,
  ): Map<string, PriceableSeries> {
    const priceableSeriesByTicker = new Map<string, PriceableSeries>();
    priceablePositions.forEach((position) => {
      const history = historyByTicker.get(position.ticker);
      if (!history) return;
      priceableSeriesByTicker.set(position.ticker, {
        priceSeries: this.buildForwardFilledSeriesFor(history, bucketer),
        exchangeRateSeries: this.resolveExchangeRateSeriesFor(history.currency, exchangeRateHistoryByCurrency, bucketer),
      });
    });
    return priceableSeriesByTicker;
  }

  private buildForwardFilledSeriesFor(history: AssetPriceHistory, bucketer: HistoryBucketer): ForwardFilledSeries {
    const closeByBucket = new Map<number, number>();
    history.points.forEach((point) => {
      closeByBucket.set(bucketer.bucketKeyFor(point.timestamp, history.gmtOffsetSeconds), point.close);
    });
    return new ForwardFilledSeries(closeByBucket, this.earliestCloseOf(history.points));
  }

  private earliestCloseOf(points: AssetPricePoint[]): number {
    if (points.length === 0) return 0;
    return points.reduce((earliestPoint, point) => (point.timestamp < earliestPoint.timestamp ? point : earliestPoint)).close;
  }

  private resolveExchangeRateSeriesFor(
    currency: string,
    exchangeRateHistoryByCurrency: Map<string, AssetPriceHistory>,
    bucketer: HistoryBucketer,
  ): ForwardFilledSeries {
    if (currency === EURO_CURRENCY) return new ForwardFilledSeries(new Map(), CONSTANT_EXCHANGE_RATE_OF_ONE);
    const exchangeRateHistory = exchangeRateHistoryByCurrency.get(currency);
    if (!exchangeRateHistory) return new ForwardFilledSeries(new Map(), CONSTANT_EXCHANGE_RATE_OF_ONE);
    return this.buildForwardFilledSeriesFor(exchangeRateHistory, bucketer);
  }

  private totalAtBucket(
    bucketKey: number,
    cashTotal: number,
    priceablePositions: Position[],
    priceableSeriesByTicker: Map<string, PriceableSeries>,
  ): number {
    const instrumentsTotal = priceablePositions.reduce((sum, position) => {
      const series = priceableSeriesByTicker.get(position.ticker);
      const contribution = series
        ? position.units * series.priceSeries.closeAt(bucketKey) * series.exchangeRateSeries.closeAt(bucketKey)
        : position.units * position.price;
      return sum + contribution;
    }, 0);
    return cashTotal + instrumentsTotal;
  }
}
