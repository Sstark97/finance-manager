import { describe, expect, it } from "vitest";
import { GoalsSettingsRowMapper } from "@/features/goals/infrastructure/GoalsSettingsRowMapper";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

describe("GoalsSettingsRowMapper", () => {
  const mapper = new GoalsSettingsRowMapper();
  const settings: GoalsSettings = {
    currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
    btcConditions: { disposable: true, dcaActive: false }, countCar: true,
  };

  it("should map integer boolean flags in the row into domain booleans", () => {
    const row = {
      userId: "user-1", currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
      btcDisposable: 1, btcDcaActive: 0, countCar: 1,
    };

    expect(mapper.toDomain(row)).toEqual(settings);
  });

  it("should map domain booleans back into integer flags in a row keyed by the owning user", () => {
    const row = mapper.toRow(settings, "user-1");

    expect(row).toEqual({
      userId: "user-1", currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
      btcDisposable: 1, btcDcaActive: 0, countCar: 1,
    });
  });
});
