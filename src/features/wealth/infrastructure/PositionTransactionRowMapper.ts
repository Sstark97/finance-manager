import type { PositionTransaction, PositionTransactionKind } from "@/features/wealth/domain/PositionTransaction";
import type { positionTransactions } from "@/infrastructure/db/schema";

type PositionTransactionRow = typeof positionTransactions.$inferSelect;
type NewPositionTransactionRow = typeof positionTransactions.$inferInsert;

export class PositionTransactionRowMapper {
  toDomain(row: PositionTransactionRow): PositionTransaction {
    return {
      id: row.id,
      positionId: row.positionId,
      kind: row.kind as PositionTransactionKind,
      executedAt: new Date(row.executedAt),
      units: row.units,
      price: row.price,
      fee: row.fee ?? undefined,
    };
  }

  toRow(transaction: PositionTransaction, createdAt: number): NewPositionTransactionRow {
    return {
      id: transaction.id,
      positionId: transaction.positionId,
      kind: transaction.kind,
      executedAt: transaction.executedAt.getTime(),
      units: transaction.units,
      price: transaction.price,
      fee: transaction.fee ?? null,
      createdAt,
    };
  }
}
