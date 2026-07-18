import type { Debt } from "@/shared/domain/types";
import { DebtLedger } from "@/shared/domain/DebtLedger";
import { netWorthCalculator, type NetWorthBreakdown } from "@/shared/domain/NetWorthCalculator";
import type { PortfolioDerived } from "@/features/wealth/domain/PortfolioCalculator";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import { WEALTH_TARGETS_INITIAL } from "@/features/wealth/data/wealthTargets";
import type { Budget, Month } from "@/features/budget/domain/types";
import { monthAvailability } from "@/features/budget/domain/MonthAvailability";
import { monthlyBudgetCalculator, type MonthlyBudgetResult } from "@/features/budget/domain/MonthlyBudgetCalculator";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import { FI_GOAL } from "@/features/goals/domain/config";
import { financialProjectionCalculator } from "@/features/goals/domain/FinancialProjectionCalculator";

export interface DashboardSummary {
  netWorth: NetWorthBreakdown;
  currentMonth: Month | null;
  monthlyResult: MonthlyBudgetResult | null;
  fiProgress: number;
  fiProjectionMonths: number | null;
  emergencyFundMet: boolean;
  emergencyFundProgress: number;
  emergencyFundTarget: number;
  emergencyFundMinimum: number;
}

export class DashboardSummaryCalculator {
  summarize(
    portfolioDerived: PortfolioDerived,
    debts: Debt[],
    baseBudget: Budget | null,
    months: Month[],
    goalsSettings: GoalsSettings | null,
    wealthTargets: WealthTargets | null,
  ): DashboardSummary {
    const debtLedger = new DebtLedger(debts);
    const shortTermDebt = debtLedger.totalActiveShortTermBalance();
    const longTermDebt = debtLedger.totalActiveLongTermBalance();
    const netWorth = netWorthCalculator.calculate(portfolioDerived.total, shortTermDebt, longTermDebt);

    const currentMonth = this.mostRecentAvailableMonth(months);
    const monthlyResult = currentMonth && baseBudget ? monthlyBudgetCalculator.calculate(currentMonth, baseBudget) : null;

    const effectiveWealthTargets = wealthTargets ?? WEALTH_TARGETS_INITIAL;
    const emergencyFundMet = portfolioDerived.liquidityTotal >= effectiveWealthTargets.minimumFund;
    const emergencyFundProgress = effectiveWealthTargets.emergencyFund
      ? Math.min(100, (portfolioDerived.liquidityTotal / effectiveWealthTargets.emergencyFund) * 100)
      : 0;

    const fiProgress = FI_GOAL.capital ? Math.min(100, (portfolioDerived.total / FI_GOAL.capital) * 100) : 0;
    const fiProjectionMonths = goalsSettings
      ? financialProjectionCalculator.project({
          initial: portfolioDerived.total, contribution: goalsSettings.fiContribution, annualReturn: goalsSettings.fiReturn, target: FI_GOAL.capital,
        }).months
      : null;

    return {
      netWorth, currentMonth, monthlyResult, fiProgress, fiProjectionMonths,
      emergencyFundMet, emergencyFundProgress,
      emergencyFundTarget: effectiveWealthTargets.emergencyFund,
      emergencyFundMinimum: effectiveWealthTargets.minimumFund,
    };
  }

  private mostRecentAvailableMonth(months: Month[]): Month | null {
    const availableMonths = months.filter(month => monthAvailability.isAvailable(month.date));
    return availableMonths[availableMonths.length - 1] ?? null;
  }
}

export const dashboardSummaryCalculator = new DashboardSummaryCalculator();
