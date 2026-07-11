import type { Budget } from "@/features/budget/domain/types";
import type { budgetBase } from "@/infrastructure/db/schema";

export const BUDGET_BASE_SINGLETON_ID = "default";

type BudgetBaseRow = typeof budgetBase.$inferSelect;
type NewBudgetBaseRow = typeof budgetBase.$inferInsert;

export class BudgetBaseRowMapper {
  toDomain(row: BudgetBaseRow): Budget {
    return {
      ingresoNeto: row.ingresoNeto,
      gastosFijos: row.gastosFijos,
      inversion: row.inversion,
      fondoEmergencia: row.fondoEmergencia,
      ocio: row.ocio,
      caprichos: row.caprichos,
    };
  }

  toRow(budget: Budget): NewBudgetBaseRow {
    return {
      id: BUDGET_BASE_SINGLETON_ID,
      ingresoNeto: budget.ingresoNeto,
      gastosFijos: budget.gastosFijos,
      inversion: budget.inversion,
      fondoEmergencia: budget.fondoEmergencia,
      ocio: budget.ocio,
      caprichos: budget.caprichos,
    };
  }
}
