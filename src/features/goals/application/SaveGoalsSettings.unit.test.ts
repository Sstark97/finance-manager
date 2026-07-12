import { describe, expect, it } from "vitest";
import { SaveGoalsSettings } from "@/features/goals/application/SaveGoalsSettings";
import type { GoalsSettingsRepository } from "@/features/goals/application/GoalsSettingsRepository";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

class RecordingGoalsSettingsRepository implements GoalsSettingsRepository {
  savedUserId: string | null = null;
  savedSettings: GoalsSettings | null = null;

  async find(): Promise<GoalsSettings> {
    throw new Error("not used in this test");
  }

  async save(userId: string, settings: GoalsSettings): Promise<void> {
    this.savedUserId = userId;
    this.savedSettings = settings;
  }
}

describe("SaveGoalsSettings", () => {
  it("should persist the given settings for the given user through the repository", async () => {
    const repository = new RecordingGoalsSettingsRepository();
    const useCase = new SaveGoalsSettings(repository);
    const settings: GoalsSettings = {
      currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
      btcConditions: { disposable: true, dcaActive: true }, countCar: true,
    };

    await useCase.invoke("user-1", settings);

    expect(repository.savedUserId).toBe("user-1");
    expect(repository.savedSettings).toEqual(settings);
  });
});
