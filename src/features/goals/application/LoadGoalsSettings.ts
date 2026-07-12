import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { GoalsSettingsRepository } from "@/features/goals/application/GoalsSettingsRepository";

export interface LoadGoalsSettingsUseCase {
  invoke(userId: string): Promise<GoalsSettings | null>;
}

export class LoadGoalsSettings implements LoadGoalsSettingsUseCase {
  constructor(private readonly goalsSettingsRepository: GoalsSettingsRepository) {}

  async invoke(userId: string): Promise<GoalsSettings | null> {
    return this.goalsSettingsRepository.find(userId);
  }
}
