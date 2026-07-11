import type React from "react";
import {
  getLoadPortfolio, getSavePortfolio,
  getLoadDebts, getSaveDebts,
  getLoadBudget, getSaveBudget,
  getLoadGoalsSettings, getSaveGoalsSettings,
} from "@/lib/di/container";
import { LoadInitialAppState } from "@/app/LoadInitialAppState";
import { PORTFOLIO_INITIAL } from "@/features/wealth/data/portfolio";
import { DEBTS_INITIAL } from "@/shared/data/debts";
import { BUDGET_BASE_INITIAL, FIXED_EXPENSES_INITIAL, MONTHS_INITIAL } from "@/features/budget/data/budget";
import { GOALS_SETTINGS_INITIAL } from "@/features/goals/data/goalsSettings";
import { FinanceAppShell } from "@/app/FinanceAppShell";

/* ============================================================================
   FINANZAS — Aitor Santana
   --------------------------------------------------------------------------
   App de 3 pestañas:
     1. Patrimonio   — cartera de inversión (fondos/ETF/cripto/efectivo) + deudas
     2. Presupuesto  — presupuesto anual, desglose mensual editable, real vs plan
     3. Metas        — libertad financiera, vivienda, fases del plan, op. Bitcoin
   Server Component: hidrata desde Turso vía use cases y siembra la primera vez
   con los datos de data/*.ts. El shell cliente persiste las mutaciones vía
   Server Actions.
   ============================================================================ */
export default async function FinanceAppPage(): Promise<React.JSX.Element> {
  const initialState = await new LoadInitialAppState({
    loadPortfolio: getLoadPortfolio(),
    savePortfolio: getSavePortfolio(),
    loadDebts: getLoadDebts(),
    saveDebts: getSaveDebts(),
    loadBudget: getLoadBudget(),
    saveBudget: getSaveBudget(),
    loadGoalsSettings: getLoadGoalsSettings(),
    saveGoalsSettings: getSaveGoalsSettings(),
    seedPortfolio: PORTFOLIO_INITIAL,
    seedDebts: DEBTS_INITIAL,
    seedBudget: { baseBudget: BUDGET_BASE_INITIAL, fixedExpenseItems: FIXED_EXPENSES_INITIAL, months: MONTHS_INITIAL },
    seedGoalsSettings: GOALS_SETTINGS_INITIAL,
  }).invoke();

  return (
    <FinanceAppShell
      initialPortfolio={initialState.portfolio}
      initialDebts={initialState.debts}
      initialBaseBudget={initialState.budget.baseBudget}
      initialFixedExpenseItems={initialState.budget.fixedExpenseItems}
      initialMonths={initialState.budget.months}
      initialCurrentSalary={initialState.goalsSettings.currentSalary}
      initialFiContribution={initialState.goalsSettings.fiContribution}
      initialFiReturn={initialState.goalsSettings.fiReturn}
      initialBtcSavings={initialState.goalsSettings.btcSavings}
      initialBtcConditions={initialState.goalsSettings.btcConditions}
      initialCountCar={initialState.goalsSettings.countCar}
    />
  );
}
