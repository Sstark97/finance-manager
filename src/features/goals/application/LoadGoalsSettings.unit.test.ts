import { describe, expect, it } from "vitest";
import { LoadGoalsSettings } from "@/features/goals/application/LoadGoalsSettings";
import type { GoalsSettingsRepository } from "@/features/goals/application/GoalsSettingsRepository";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

class FakeGoalsSettingsRepository implements GoalsSettingsRepository {
  constructor(private readonly settings: GoalsSettings | null) {}

  async find(): Promise<GoalsSettings | null> {
    return this.settings;
  }

  async save(): Promise<void> {
    throw new Error("not used in this test");
  }
}

describe("LoadGoalsSettings", () => {
  it("should return the settings stored in the repository for the given user", async () => {
    const settings: GoalsSettings = {
      currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
      btcConditions: { disposable: true, dcaActive: true },
    };
    const useCase = new LoadGoalsSettings(new FakeGoalsSettingsRepository(settings));

    const result = await useCase.invoke("user-1");

    expect(result).toEqual(settings);
  });

  it("should propagate null when the settings have not been configured yet", async () => {
    const useCase = new LoadGoalsSettings(new FakeGoalsSettingsRepository(null));

    const result = await useCase.invoke("user-1");

    expect(result).toBeNull();
  });
});
