import { CachingAssetPriceGateway } from "@/features/wealth/infrastructure/CachingAssetPriceGateway";
import { YahooFinanceAssetPriceGateway } from "@/features/wealth/infrastructure/YahooFinanceAssetPriceGateway";
import { CachingAssetPriceHistoryGateway } from "@/features/wealth/infrastructure/CachingAssetPriceHistoryGateway";
import { YahooFinanceAssetPriceHistoryGateway } from "@/features/wealth/infrastructure/YahooFinanceAssetPriceHistoryGateway";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import { PortfolioHistoryCalculator } from "@/features/wealth/domain/PortfolioHistoryCalculator";
import { RefreshPositionPrices, type RefreshPositionPricesUseCase } from "@/features/wealth/application/RefreshPositionPrices";
import { ComputePortfolioHistory, type ComputePortfolioHistoryUseCase } from "@/features/wealth/application/ComputePortfolioHistory";

const assetPriceGateway = new CachingAssetPriceGateway(new YahooFinanceAssetPriceGateway());
const refreshPositionPrices = new RefreshPositionPrices(assetPriceGateway, new PortfolioCalculator());

const assetPriceHistoryGateway = new CachingAssetPriceHistoryGateway(new YahooFinanceAssetPriceHistoryGateway());
const computePortfolioHistory = new ComputePortfolioHistory(assetPriceHistoryGateway, new PortfolioHistoryCalculator());

export function getRefreshPositionPrices(): RefreshPositionPricesUseCase {
  return refreshPositionPrices;
}

export function getComputePortfolioHistory(): ComputePortfolioHistoryUseCase {
  return computePortfolioHistory;
}
