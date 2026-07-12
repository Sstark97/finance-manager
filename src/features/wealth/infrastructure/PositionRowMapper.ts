import type { EquityIndexKey, Position, PositionType, PositionGroup } from "@/features/wealth/domain/types";
import type { positions } from "@/infrastructure/db/schema";

type PositionRow = typeof positions.$inferSelect;
type NewPositionRow = typeof positions.$inferInsert;

export class PositionRowMapper {
  toDomain(row: PositionRow): Position {
    return {
      id: row.id,
      name: row.name,
      ticker: row.ticker,
      type: row.type as PositionType,
      units: row.units,
      price: row.lastPrice ?? 0,
      group: row.groupName as PositionGroup,
      equityIndex: (row.equityIndex as EquityIndexKey | null) ?? null,
    };
  }

  toRow(position: Position, userId: string, updatedAt: number): NewPositionRow {
    return {
      id: position.id,
      userId,
      name: position.name,
      ticker: position.ticker,
      type: position.type,
      units: position.units,
      groupName: position.group,
      lastPrice: position.price,
      equityIndex: position.equityIndex,
      updatedAt,
    };
  }
}
