import type React from "react";
import { container } from "@/lib/di/ContainerDI";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import { LoadInitialAppState } from "@/app/LoadInitialAppState";
import { FinanceAppShell } from "@/app/FinanceAppShell";

export default async function FinanceAppPage(): Promise<React.JSX.Element> {
  const currentUser = await currentUserProvider.requireUser();

  const initialState = await new LoadInitialAppState({
    loadPortfolio: container.loadPortfolio(),
    loadDebts: container.loadDebts(),
    loadBudget: container.loadBudget(),
    loadGoalsSettings: container.loadGoalsSettings(),
    loadWealthTargets: container.loadWealthTargets(),
  }).invoke(currentUser.id);

  return (
    <FinanceAppShell
      currentUserEmail={currentUser.email}
      initialPortfolio={initialState.portfolio}
      initialDebts={initialState.debts}
      initialBaseBudget={initialState.budget.baseBudget}
      initialFixedExpenseItems={initialState.budget.fixedExpenseItems}
      initialMonths={initialState.budget.months}
      initialGoalsSettings={initialState.goalsSettings}
      initialWealthTargets={initialState.wealthTargets}
    />
  );
}
