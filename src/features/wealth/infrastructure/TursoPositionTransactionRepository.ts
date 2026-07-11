import { eq } from "drizzle-orm";
import type { PositionTransaction } from "@/features/wealth/domain/PositionTransaction";
import type { PositionTransactionRepository } from "@/features/wealth/application/PositionTransactionRepository";
import type { Database } from "@/infrastructure/db/client";
import { positionTransactions } from "@/infrastructure/db/schema";
import { PositionTransactionRowMapper } from "@/features/wealth/infrastructure/PositionTransactionRowMapper";

export class TursoPositionTransactionRepository implements PositionTransactionRepository {
  constructor(
    private readonly database: Database,
    private readonly mapper: PositionTransactionRowMapper = new PositionTransactionRowMapper(),
  ) {}

  async findByPositionId(positionId: string): Promise<PositionTransaction[]> {
    const rows = await this.database.select().from(positionTransactions).where(eq(positionTransactions.positionId, positionId));
    return rows.map((row) => this.mapper.toDomain(row));
  }

  async save(transaction: PositionTransaction): Promise<void> {
    await this.database.insert(positionTransactions).values(this.mapper.toRow(transaction, Date.now()));
  }
}
