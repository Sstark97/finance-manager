import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

export interface GoalsSettingsRepository {
  find(): Promise<GoalsSettings | null>;
  save(settings: GoalsSettings): Promise<void>;
}
