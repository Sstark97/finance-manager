import { CachingAssetPriceGateway } from "@/features/wealth/infrastructure/CachingAssetPriceGateway";
import { YahooFinanceAssetPriceGateway } from "@/features/wealth/infrastructure/YahooFinanceAssetPriceGateway";
import { CachingAssetPriceHistoryGateway } from "@/features/wealth/infrastructure/CachingAssetPriceHistoryGateway";
import { YahooFinanceAssetPriceHistoryGateway } from "@/features/wealth/infrastructure/YahooFinanceAssetPriceHistoryGateway";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import { PortfolioHistoryCalculator } from "@/features/wealth/domain/PortfolioHistoryCalculator";
import { RefreshPositionPrices, type RefreshPositionPricesUseCase } from "@/features/wealth/application/RefreshPositionPrices";
import { ComputePortfolioHistory, type ComputePortfolioHistoryUseCase } from "@/features/wealth/application/ComputePortfolioHistory";

import { TursoClientFactory, toDatabase, type Database } from "@/infrastructure/db/client";

import { TursoDebtRepository } from "@/shared/infrastructure/TursoDebtRepository";
import { LoadDebts, type LoadDebtsUseCase } from "@/shared/application/LoadDebts";
import { SaveDebts, type SaveDebtsUseCase } from "@/shared/application/SaveDebts";

import { TursoPortfolioRepository } from "@/features/wealth/infrastructure/TursoPortfolioRepository";
import { LoadPortfolio, type LoadPortfolioUseCase } from "@/features/wealth/application/LoadPortfolio";
import { SavePortfolio, type SavePortfolioUseCase } from "@/features/wealth/application/SavePortfolio";

import { TursoBudgetRepository } from "@/features/budget/infrastructure/TursoBudgetRepository";
import { TursoMonthRepository } from "@/features/budget/infrastructure/TursoMonthRepository";
import { TursoBudgetTransactionRunner } from "@/features/budget/infrastructure/TursoBudgetTransactionRunner";
import { LoadBudget, type LoadBudgetUseCase } from "@/features/budget/application/LoadBudget";
import { SaveBudget, type SaveBudgetUseCase } from "@/features/budget/application/SaveBudget";

import { TursoGoalsSettingsRepository } from "@/features/goals/infrastructure/TursoGoalsSettingsRepository";
import { LoadGoalsSettings, type LoadGoalsSettingsUseCase } from "@/features/goals/application/LoadGoalsSettings";
import { SaveGoalsSettings, type SaveGoalsSettingsUseCase } from "@/features/goals/application/SaveGoalsSettings";

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

let cachedDatabase: Database | null = null;

function getDatabase(): Database {
  if (!cachedDatabase) {
    cachedDatabase = toDatabase(new TursoClientFactory().create());
  }
  return cachedDatabase;
}

export function getLoadDebts(): LoadDebtsUseCase {
  return new LoadDebts(new TursoDebtRepository(getDatabase()));
}

export function getSaveDebts(): SaveDebtsUseCase {
  return new SaveDebts(new TursoDebtRepository(getDatabase()));
}

export function getLoadPortfolio(): LoadPortfolioUseCase {
  return new LoadPortfolio(new TursoPortfolioRepository(getDatabase()));
}

export function getSavePortfolio(): SavePortfolioUseCase {
  return new SavePortfolio(new TursoPortfolioRepository(getDatabase()));
}

export function getLoadBudget(): LoadBudgetUseCase {
  return new LoadBudget(new TursoBudgetRepository(getDatabase()), new TursoMonthRepository(getDatabase()));
}

export function getSaveBudget(): SaveBudgetUseCase {
  return new SaveBudget(new TursoBudgetTransactionRunner(getDatabase()));
}

export function getLoadGoalsSettings(): LoadGoalsSettingsUseCase {
  return new LoadGoalsSettings(new TursoGoalsSettingsRepository(getDatabase()));
}

export function getSaveGoalsSettings(): SaveGoalsSettingsUseCase {
  return new SaveGoalsSettings(new TursoGoalsSettingsRepository(getDatabase()));
}
