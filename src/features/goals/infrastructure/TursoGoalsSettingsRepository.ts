import { eq } from "drizzle-orm";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { GoalsSettingsRepository } from "@/features/goals/application/GoalsSettingsRepository";
import type { Database } from "@/infrastructure/db/client";
import { goalsSettings as goalsSettingsTable } from "@/infrastructure/db/schema";
import { GoalsSettingsRowMapper, GOALS_SETTINGS_SINGLETON_ID } from "@/features/goals/infrastructure/GoalsSettingsRowMapper";

export class TursoGoalsSettingsRepository implements GoalsSettingsRepository {
  constructor(
    private readonly database: Database,
    private readonly mapper: GoalsSettingsRowMapper = new GoalsSettingsRowMapper(),
  ) {}

  async find(): Promise<GoalsSettings> {
    const [row] = await this.database.select().from(goalsSettingsTable).where(eq(goalsSettingsTable.id, GOALS_SETTINGS_SINGLETON_ID));
    if (!row) {
      throw new Error("goals_settings singleton row is missing; run the seed script before loading goals settings");
    }
    return this.mapper.toDomain(row);
  }

  async save(settings: GoalsSettings): Promise<void> {
    const row = this.mapper.toRow(settings);
    await this.database
      .insert(goalsSettingsTable)
      .values(row)
      .onConflictDoUpdate({ target: goalsSettingsTable.id, set: row });
  }
}
