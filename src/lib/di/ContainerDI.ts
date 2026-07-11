import { CachingAssetPriceGateway } from "@/features/wealth/infrastructure/CachingAssetPriceGateway";
import { YahooFinanceAssetPriceGateway } from "@/features/wealth/infrastructure/YahooFinanceAssetPriceGateway";
import { CachingAssetPriceHistoryGateway } from "@/features/wealth/infrastructure/CachingAssetPriceHistoryGateway";
import { YahooFinanceAssetPriceHistoryGateway } from "@/features/wealth/infrastructure/YahooFinanceAssetPriceHistoryGateway";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import { PortfolioHistoryCalculator } from "@/features/wealth/domain/PortfolioHistoryCalculator";
import { RefreshPositionPrices, type RefreshPositionPricesUseCase } from "@/features/wealth/application/RefreshPositionPrices";
import { ComputePortfolioHistory, type ComputePortfolioHistoryUseCase } from "@/features/wealth/application/ComputePortfolioHistory";

import { TursoClientFactory, type Database } from "@/infrastructure/db/client";

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

export class ContainerDI {
  private readonly assetPriceGateway = new CachingAssetPriceGateway(new YahooFinanceAssetPriceGateway());
  private readonly refreshPositionPricesUseCase = new RefreshPositionPrices(this.assetPriceGateway, new PortfolioCalculator());

  private readonly assetPriceHistoryGateway = new CachingAssetPriceHistoryGateway(new YahooFinanceAssetPriceHistoryGateway());
  private readonly computePortfolioHistoryUseCase = new ComputePortfolioHistory(this.assetPriceHistoryGateway, new PortfolioHistoryCalculator());

  private cachedDatabase: Database | null = null;

  refreshPositionPrices(): RefreshPositionPricesUseCase {
    return this.refreshPositionPricesUseCase;
  }

  computePortfolioHistory(): ComputePortfolioHistoryUseCase {
    return this.computePortfolioHistoryUseCase;
  }

  loadDebts(): LoadDebtsUseCase {
    return new LoadDebts(new TursoDebtRepository(this.database()));
  }

  saveDebts(): SaveDebtsUseCase {
    return new SaveDebts(new TursoDebtRepository(this.database()));
  }

  loadPortfolio(): LoadPortfolioUseCase {
    return new LoadPortfolio(new TursoPortfolioRepository(this.database()));
  }

  savePortfolio(): SavePortfolioUseCase {
    return new SavePortfolio(new TursoPortfolioRepository(this.database()));
  }

  loadBudget(): LoadBudgetUseCase {
    return new LoadBudget(new TursoBudgetRepository(this.database()), new TursoMonthRepository(this.database()));
  }

  saveBudget(): SaveBudgetUseCase {
    return new SaveBudget(new TursoBudgetTransactionRunner(this.database()));
  }

  loadGoalsSettings(): LoadGoalsSettingsUseCase {
    return new LoadGoalsSettings(new TursoGoalsSettingsRepository(this.database()));
  }

  saveGoalsSettings(): SaveGoalsSettingsUseCase {
    return new SaveGoalsSettings(new TursoGoalsSettingsRepository(this.database()));
  }

  private database(): Database {
    if (!this.cachedDatabase) {
      this.cachedDatabase = TursoClientFactory.toDatabase(new TursoClientFactory().create());
    }
    return this.cachedDatabase;
  }
}

export const container = new ContainerDI();
