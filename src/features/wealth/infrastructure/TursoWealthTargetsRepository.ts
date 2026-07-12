import { eq } from "drizzle-orm";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import type { WealthTargetsRepository } from "@/features/wealth/application/WealthTargetsRepository";
import type { Database } from "@/infrastructure/db/client";
import { wealthTargets as wealthTargetsTable } from "@/infrastructure/db/schema";
import { WealthTargetsRowMapper } from "@/features/wealth/infrastructure/WealthTargetsRowMapper";

export class TursoWealthTargetsRepository implements WealthTargetsRepository {
  constructor(
    private readonly database: Database,
    private readonly mapper: WealthTargetsRowMapper = new WealthTargetsRowMapper(),
  ) {}

  async find(userId: string): Promise<WealthTargets | null> {
    const [row] = await this.database.select().from(wealthTargetsTable).where(eq(wealthTargetsTable.userId, userId));
    if (!row) {
      return null;
    }
    return this.mapper.toDomain(row);
  }

  async save(userId: string, targets: WealthTargets): Promise<void> {
    const row = this.mapper.toRow(targets, userId);
    await this.database
      .insert(wealthTargetsTable)
      .values(row)
      .onConflictDoUpdate({ target: wealthTargetsTable.userId, set: row });
  }
}
