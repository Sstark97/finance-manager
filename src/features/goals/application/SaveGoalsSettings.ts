import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { GoalsSettingsRepository } from "@/features/goals/application/GoalsSettingsRepository";

export interface SaveGoalsSettingsUseCase {
  invoke(settings: GoalsSettings): Promise<void>;
}

export class SaveGoalsSettings implements SaveGoalsSettingsUseCase {
  constructor(private readonly goalsSettingsRepository: GoalsSettingsRepository) {}

  async invoke(settings: GoalsSettings): Promise<void> {
    await this.goalsSettingsRepository.save(settings);
  }
}
