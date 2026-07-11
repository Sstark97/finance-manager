import { describe, expect, it } from "vitest";
import { LoadGoalsSettings } from "@/features/goals/application/LoadGoalsSettings";
import type { GoalsSettingsRepository } from "@/features/goals/application/GoalsSettingsRepository";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

class FakeGoalsSettingsRepository implements GoalsSettingsRepository {
  constructor(private readonly settings: GoalsSettings) {}

  async find(): Promise<GoalsSettings> {
    return this.settings;
  }

  async save(): Promise<void> {
    throw new Error("not used in this test");
  }
}

describe("LoadGoalsSettings", () => {
  it("should return the settings stored in the repository", async () => {
    const settings: GoalsSettings = {
      currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
      btcConditions: { disposable: true, dcaActive: true }, countCar: true,
    };
    const useCase = new LoadGoalsSettings(new FakeGoalsSettingsRepository(settings));

    const result = await useCase.invoke();

    expect(result).toEqual(settings);
  });
});
