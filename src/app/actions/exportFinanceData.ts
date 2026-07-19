"use server";

import { container } from "@/lib/di/ContainerDI";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import { financeDataExporter } from "@/shared/domain/FinanceDataExporter";

export interface FinanceDataExport {
  json: string;
  csv: string;
}

export async function exportFinanceData(): Promise<FinanceDataExport> {
  const userId = await currentUserProvider.requireUserId();
  const [portfolio, debts, budget] = await Promise.all([
    container.loadPortfolio().invoke(userId),
    container.loadDebts().invoke(userId),
    container.loadBudget().invoke(userId),
  ]);

  const state = {
    portfolio,
    debts,
    baseBudget: budget.baseBudget,
    fixedExpenseItems: budget.fixedExpenseItems,
    months: budget.months,
  };

  return {
    json: financeDataExporter.toJson(state),
    csv: financeDataExporter.toCsv(state),
  };
}
