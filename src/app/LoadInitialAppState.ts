import type { Position } from "@/features/wealth/domain/types";
import type { Debt } from "@/shared/domain/types";
import type { BudgetSnapshot } from "@/features/budget/application/BudgetSnapshot";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import type { LoadPortfolioUseCase } from "@/features/wealth/application/LoadPortfolio";
import type { LoadDebtsUseCase } from "@/shared/application/LoadDebts";
import type { LoadBudgetUseCase } from "@/features/budget/application/LoadBudget";
import type { LoadGoalsSettingsUseCase } from "@/features/goals/application/LoadGoalsSettings";
import type { LoadWealthTargetsUseCase } from "@/features/wealth/application/LoadWealthTargets";

export interface InitialAppState {
  portfolio: Position[];
  debts: Debt[];
  budget: BudgetSnapshot;
  goalsSettings: GoalsSettings | null;
  wealthTargets: WealthTargets | null;
}

export interface LoadInitialAppStateDependencies {
  loadPortfolio: LoadPortfolioUseCase;
  loadDebts: LoadDebtsUseCase;
  loadBudget: LoadBudgetUseCase;
  loadGoalsSettings: LoadGoalsSettingsUseCase;
  loadWealthTargets: LoadWealthTargetsUseCase;
}

export class LoadInitialAppState {
  constructor(private readonly dependencies: LoadInitialAppStateDependencies) {}

  async invoke(userId: string): Promise<InitialAppState> {
    const [portfolio, debts, budget, goalsSettings, wealthTargets] = await Promise.all([
      this.dependencies.loadPortfolio.invoke(userId),
      this.dependencies.loadDebts.invoke(userId),
      this.dependencies.loadBudget.invoke(userId),
      this.dependencies.loadGoalsSettings.invoke(userId),
      this.dependencies.loadWealthTargets.invoke(userId),
    ]);

    return { portfolio, debts, budget, goalsSettings, wealthTargets };
  }
}
