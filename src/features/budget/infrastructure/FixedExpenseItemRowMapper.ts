import type { FixedExpenseItem } from "@/features/budget/domain/types";
import type { fixedExpenseItems } from "@/infrastructure/db/schema";

type FixedExpenseItemRow = typeof fixedExpenseItems.$inferSelect;
type NewFixedExpenseItemRow = typeof fixedExpenseItems.$inferInsert;

export class FixedExpenseItemRowMapper {
  toDomain(row: FixedExpenseItemRow): FixedExpenseItem {
    return {
      id: row.id,
      name: row.name,
      amount: row.amount,
    };
  }

  toRow(item: FixedExpenseItem, userId: string, sortOrder: number): NewFixedExpenseItemRow {
    return {
      id: item.id,
      userId,
      name: item.name,
      amount: item.amount,
      sortOrder,
    };
  }
}
