import { and, eq } from "drizzle-orm";
import type { PositionTransaction } from "@/features/wealth/domain/PositionTransaction";
import type { PositionTransactionRepository } from "@/features/wealth/application/PositionTransactionRepository";
import type { Database } from "@/infrastructure/db/client";
import { positionTransactions, positions } from "@/infrastructure/db/schema";
import { PositionTransactionRowMapper } from "@/features/wealth/infrastructure/PositionTransactionRowMapper";

export class PositionNotOwnedByUserError extends Error {
  constructor(positionId: string, userId: string) {
    super(`Position "${positionId}" does not belong to user "${userId}"`);
    this.name = "PositionNotOwnedByUserError";
  }
}

export class TursoPositionTransactionRepository implements PositionTransactionRepository {
  constructor(
    private readonly database: Database,
    private readonly mapper: PositionTransactionRowMapper = new PositionTransactionRowMapper(),
  ) {}

  async findByPositionId(userId: string, positionId: string): Promise<PositionTransaction[]> {
    const rows = await this.database
      .select({ transaction: positionTransactions })
      .from(positionTransactions)
      .innerJoin(positions, eq(positions.id, positionTransactions.positionId))
      .where(and(eq(positionTransactions.positionId, positionId), eq(positions.userId, userId)));
    return rows.map((row) => this.mapper.toDomain(row.transaction));
  }

  async save(userId: string, transaction: PositionTransaction): Promise<void> {
    await this.rejectIfPositionNotOwnedByUser(userId, transaction.positionId);
    await this.database.insert(positionTransactions).values(this.mapper.toRow(transaction, Date.now()));
  }

  private async rejectIfPositionNotOwnedByUser(userId: string, positionId: string): Promise<void> {
    const [ownedPosition] = await this.database
      .select({ id: positions.id })
      .from(positions)
      .where(and(eq(positions.id, positionId), eq(positions.userId, userId)));
    if (!ownedPosition) {
      throw new PositionNotOwnedByUserError(positionId, userId);
    }
  }
}
