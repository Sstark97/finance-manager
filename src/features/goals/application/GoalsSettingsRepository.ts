import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

export interface GoalsSettingsRepository {
  find(userId: string): Promise<GoalsSettings | null>;
  save(userId: string, settings: GoalsSettings): Promise<void>;
}
