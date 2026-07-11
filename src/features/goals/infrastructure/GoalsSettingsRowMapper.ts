import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { goalsSettings } from "@/infrastructure/db/schema";

export const GOALS_SETTINGS_SINGLETON_ID = "default";

type GoalsSettingsRow = typeof goalsSettings.$inferSelect;
type NewGoalsSettingsRow = typeof goalsSettings.$inferInsert;

export class GoalsSettingsRowMapper {
  toDomain(row: GoalsSettingsRow): GoalsSettings {
    return {
      currentSalary: row.currentSalary,
      fiContribution: row.fiContribution,
      fiReturn: row.fiReturn,
      btcSavings: row.btcSavings,
      btcConditions: {
        disposable: row.btcDisposable === 1,
        dcaActive: row.btcDcaActive === 1,
      },
      countCar: row.countCar === 1,
    };
  }

  toRow(settings: GoalsSettings): NewGoalsSettingsRow {
    return {
      id: GOALS_SETTINGS_SINGLETON_ID,
      currentSalary: settings.currentSalary,
      fiContribution: settings.fiContribution,
      fiReturn: settings.fiReturn,
      btcSavings: settings.btcSavings,
      btcDisposable: settings.btcConditions.disposable ? 1 : 0,
      btcDcaActive: settings.btcConditions.dcaActive ? 1 : 0,
      countCar: settings.countCar ? 1 : 0,
    };
  }
}
