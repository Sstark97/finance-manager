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
      settledAt: row.settledAt ?? undefined,
    };
  }

  toRow(debt: Debt, userId: string): NewDebtRow {
    return {
      id: debt.id,
      userId,
      name: debt.name,
      installment: debt.installment,
      balance: debt.balance,
      note: debt.note,
      deadline: debt.deadline ?? null,
      settledAt: debt.settledAt ?? null,
    };
  }
}
