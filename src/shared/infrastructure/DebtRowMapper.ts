import type { Debt } from "@/shared/domain/types";
import type { debts } from "@/infrastructure/db/schema";

type DebtRow = typeof debts.$inferSelect;
type NewDebtRow = typeof debts.$inferInsert;

export class DebtRowMapper {
  toDomain(row: DebtRow): Debt {
    return {
      id: row.id,
      name: row.name,
      installment: row.installment,
      balance: row.balance,
      note: row.note,
      deadline: row.deadline ?? undefined,
    };
  }

  toRow(debt: Debt): NewDebtRow {
    return {
      id: debt.id,
      name: debt.name,
      installment: debt.installment,
      balance: debt.balance,
      note: debt.note,
      deadline: debt.deadline ?? null,
    };
  }
}
