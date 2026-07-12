import { eq } from "drizzle-orm";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { GoalsSettingsRepository } from "@/features/goals/application/GoalsSettingsRepository";
import type { Database } from "@/infrastructure/db/client";
import { goalsSettings as goalsSettingsTable } from "@/infrastructure/db/schema";
import { GoalsSettingsRowMapper } from "@/features/goals/infrastructure/GoalsSettingsRowMapper";

export class TursoGoalsSettingsRepository implements GoalsSettingsRepository {
  constructor(
    private readonly database: Database,
    private readonly mapper: GoalsSettingsRowMapper = new GoalsSettingsRowMapper(),
  ) {}

  async find(userId: string): Promise<GoalsSettings | null> {
    const [row] = await this.database.select().from(goalsSettingsTable).where(eq(goalsSettingsTable.userId, userId));
    if (!row) {
      return null;
    }
    return this.mapper.toDomain(row);
  }

  async save(userId: string, settings: GoalsSettings): Promise<void> {
    const row = this.mapper.toRow(settings, userId);
    await this.database
      .insert(goalsSettingsTable)
      .values(row)
      .onConflictDoUpdate({ target: goalsSettingsTable.userId, set: row });
  }
}
