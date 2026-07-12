import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TursoGoalsSettingsRepository } from "@/features/goals/infrastructure/TursoGoalsSettingsRepository";
import { TestDatabaseFactory, type TestDatabase } from "@/infrastructure/db/__fixtures__/TestDatabaseFactory";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

describe("TursoGoalsSettingsRepository", () => {
  let testDatabase: TestDatabase;
  let repository: TursoGoalsSettingsRepository;

  beforeEach(async () => {
    testDatabase = await new TestDatabaseFactory().create();
    repository = new TursoGoalsSettingsRepository(testDatabase.database);
    await testDatabase.seedUser("user-1");
    await testDatabase.seedUser("user-2");
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return null when the goals settings have not been seeded yet for the user", async () => {
    await expect(repository.find("user-1")).resolves.toBeNull();
  });

  it("should round-trip the goals settings through save and find", async () => {
    const settings: GoalsSettings = {
      currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
      btcConditions: { disposable: true, dcaActive: true }, countCar: true,
    };

    await repository.save("user-1", settings);
    const storedSettings = await repository.find("user-1");

    expect(storedSettings).toEqual(settings);
  });

  it("should overwrite the existing goals settings on a second save call for the same user", async () => {
    const initialSettings: GoalsSettings = {
      currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
      btcConditions: { disposable: true, dcaActive: true }, countCar: true,
    };
    const revisedSettings: GoalsSettings = { ...initialSettings, currentSalary: 30000, btcConditions: { disposable: false, dcaActive: false } };

    await repository.save("user-1", initialSettings);
    await repository.save("user-1", revisedSettings);
    const storedSettings = await repository.find("user-1");

    expect(storedSettings).toEqual(revisedSettings);
  });

  it("should keep goals settings isolated per user", async () => {
    const firstUserSettings: GoalsSettings = {
      currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
      btcConditions: { disposable: true, dcaActive: true }, countCar: true,
    };
    const secondUserSettings: GoalsSettings = {
      currentSalary: 40000, fiContribution: 500, fiReturn: 0.05, btcSavings: 100,
      btcConditions: { disposable: false, dcaActive: false }, countCar: false,
    };

    await repository.save("user-1", firstUserSettings);
    await repository.save("user-2", secondUserSettings);

    expect(await repository.find("user-1")).toEqual(firstUserSettings);
    expect(await repository.find("user-2")).toEqual(secondUserSettings);
  });
});
