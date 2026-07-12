import { eq } from "drizzle-orm";
import type { Position } from "@/features/wealth/domain/types";
import type { PortfolioRepository } from "@/features/wealth/application/PortfolioRepository";
import type { Database } from "@/infrastructure/db/client";
import { positions as positionsTable } from "@/infrastructure/db/schema";
import { PositionRowMapper } from "@/features/wealth/infrastructure/PositionRowMapper";

export class TursoPortfolioRepository implements PortfolioRepository {
  constructor(
    private readonly database: Database,
    private readonly mapper: PositionRowMapper = new PositionRowMapper(),
  ) {}

  async findAll(userId: string): Promise<Position[]> {
    const rows = await this.database.select().from(positionsTable).where(eq(positionsTable.userId, userId));
    return rows.map((row) => this.mapper.toDomain(row));
  }

  async saveAll(userId: string, positions: Position[]): Promise<void> {
    const updatedAt = Date.now();
    await this.database.transaction(async (transaction) => {
      await transaction.delete(positionsTable).where(eq(positionsTable.userId, userId));
      if (positions.length === 0) {
        return;
      }
      await transaction.insert(positionsTable).values(positions.map((position) => this.mapper.toRow(position, userId, updatedAt)));
    });
  }
}
