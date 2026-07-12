import { eq } from "drizzle-orm";
import type { Debt } from "@/shared/domain/types";
import type { DebtRepository } from "@/shared/application/DebtRepository";
import type { Database } from "@/infrastructure/db/client";
import { debts as debtsTable } from "@/infrastructure/db/schema";
import { DebtRowMapper } from "@/shared/infrastructure/DebtRowMapper";

export class TursoDebtRepository implements DebtRepository {
  constructor(
    private readonly database: Database,
    private readonly mapper: DebtRowMapper = new DebtRowMapper(),
  ) {}

  async findAll(userId: string): Promise<Debt[]> {
    const rows = await this.database.select().from(debtsTable).where(eq(debtsTable.userId, userId));
    return rows.map((row) => this.mapper.toDomain(row));
  }

  async saveAll(userId: string, debts: Debt[]): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.delete(debtsTable).where(eq(debtsTable.userId, userId));
      if (debts.length === 0) {
        return;
      }
      await transaction.insert(debtsTable).values(debts.map((debt) => this.mapper.toRow(debt, userId)));
    });
  }
}
