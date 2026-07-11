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
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return null when the goals settings singleton has not been seeded yet", async () => {
    await expect(repository.find()).resolves.toBeNull();
  });

  it("should round-trip the goals settings singleton through save and find", async () => {
    const settings: GoalsSettings = {
      currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
      btcConditions: { disposable: true, dcaActive: true }, countCar: true,
    };

    await repository.save(settings);
    const storedSettings = await repository.find();

    expect(storedSettings).toEqual(settings);
  });

  it("should overwrite the existing goals settings singleton on a second save call", async () => {
    const initialSettings: GoalsSettings = {
      currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
      btcConditions: { disposable: true, dcaActive: true }, countCar: true,
    };
    const revisedSettings: GoalsSettings = { ...initialSettings, currentSalary: 30000, btcConditions: { disposable: false, dcaActive: false } };

    await repository.save(initialSettings);
    await repository.save(revisedSettings);
    const storedSettings = await repository.find();

    expect(storedSettings).toEqual(revisedSettings);
  });
});
