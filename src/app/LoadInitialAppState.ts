import type { Position } from "@/features/wealth/domain/types";
import type { Debt } from "@/shared/domain/types";
import type { BudgetSnapshot } from "@/features/budget/application/BudgetSnapshot";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { LoadPortfolioUseCase } from "@/features/wealth/application/LoadPortfolio";
import type { SavePortfolioUseCase } from "@/features/wealth/application/SavePortfolio";
import type { LoadDebtsUseCase } from "@/shared/application/LoadDebts";
import type { SaveDebtsUseCase } from "@/shared/application/SaveDebts";
import type { LoadBudgetUseCase } from "@/features/budget/application/LoadBudget";
import type { SaveBudgetUseCase } from "@/features/budget/application/SaveBudget";
import type { LoadGoalsSettingsUseCase } from "@/features/goals/application/LoadGoalsSettings";
import type { SaveGoalsSettingsUseCase } from "@/features/goals/application/SaveGoalsSettings";

export interface InitialAppState {
  portfolio: Position[];
  debts: Debt[];
  budget: BudgetSnapshot;
  goalsSettings: GoalsSettings;
}

export interface LoadInitialAppStateDependencies {
  loadPortfolio: LoadPortfolioUseCase;
  savePortfolio: SavePortfolioUseCase;
  loadDebts: LoadDebtsUseCase;
  saveDebts: SaveDebtsUseCase;
  loadBudget: LoadBudgetUseCase;
  saveBudget: SaveBudgetUseCase;
  loadGoalsSettings: LoadGoalsSettingsUseCase;
  saveGoalsSettings: SaveGoalsSettingsUseCase;
  seedPortfolio: Position[];
  seedDebts: Debt[];
  seedBudget: BudgetSnapshot;
  seedGoalsSettings: GoalsSettings;
}

export class LoadInitialAppState {
  constructor(private readonly dependencies: LoadInitialAppStateDependencies) {}

  async invoke(): Promise<InitialAppState> {
    const hasBeenSeeded = await this.checkHasBeenSeeded();
    if (!hasBeenSeeded) {
      await this.seed();
    }

    const [portfolio, debts, budget, goalsSettings] = await Promise.all([
      this.dependencies.loadPortfolio.invoke(),
      this.dependencies.loadDebts.invoke(),
      this.dependencies.loadBudget.invoke(),
      this.dependencies.loadGoalsSettings.invoke(),
    ]);

    return { portfolio, debts, budget, goalsSettings };
  }

  private async checkHasBeenSeeded(): Promise<boolean> {
    try {
      await this.dependencies.loadGoalsSettings.invoke();
      return true;
    } catch {
      return false;
    }
  }

  private async seed(): Promise<void> {
    await this.dependencies.savePortfolio.invoke(this.dependencies.seedPortfolio);
    await this.dependencies.saveDebts.invoke(this.dependencies.seedDebts);
    await this.dependencies.saveBudget.invoke(this.dependencies.seedBudget);

    const hasBeenSeededByConcurrentRequest = await this.checkHasBeenSeeded();
    if (hasBeenSeededByConcurrentRequest) {
      return;
    }

    await this.dependencies.saveGoalsSettings.invoke(this.dependencies.seedGoalsSettings);
  }
}
