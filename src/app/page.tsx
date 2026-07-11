import type React from "react";
import { container } from "@/lib/di/ContainerDI";
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
    loadPortfolio: container.loadPortfolio(),
    savePortfolio: container.savePortfolio(),
    loadDebts: container.loadDebts(),
    saveDebts: container.saveDebts(),
    loadBudget: container.loadBudget(),
    saveBudget: container.saveBudget(),
    loadGoalsSettings: container.loadGoalsSettings(),
    saveGoalsSettings: container.saveGoalsSettings(),
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
      initialGoalsSettings={initialState.goalsSettings}
    />
  );
}
