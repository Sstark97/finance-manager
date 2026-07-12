import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { GoalsSettingsRepository } from "@/features/goals/application/GoalsSettingsRepository";

export interface SaveGoalsSettingsUseCase {
  invoke(userId: string, settings: GoalsSettings): Promise<void>;
}

export class SaveGoalsSettings implements SaveGoalsSettingsUseCase {
  constructor(private readonly goalsSettingsRepository: GoalsSettingsRepository) {}

  async invoke(userId: string, settings: GoalsSettings): Promise<void> {
    await this.goalsSettingsRepository.save(userId, settings);
  }
}
