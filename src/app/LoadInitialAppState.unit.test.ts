import { describe, expect, it, vi } from "vitest";
import { LoadInitialAppState, type LoadInitialAppStateDependencies } from "@/app/LoadInitialAppState";
import type { Position } from "@/features/wealth/domain/types";
import type { Debt } from "@/shared/domain/types";
import type { BudgetSnapshot } from "@/features/budget/application/BudgetSnapshot";
import type { BudgetSnapshotToSave } from "@/features/budget/application/SaveBudget";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

function buildDependencies(overrides: Partial<LoadInitialAppStateDependencies> = {}): LoadInitialAppStateDependencies {
  const seedPortfolio: Position[] = [{ id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc" }];
  const seedDebts: Debt[] = [{ id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" }];
  const seedBudget: BudgetSnapshotToSave = {
    baseBudget: { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 },
    fixedExpenseItems: [], months: [],
  };
  const seedGoalsSettings: GoalsSettings = { currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0, btcConditions: { disposable: true, dcaActive: true }, countCar: true };

  return {
    loadPortfolio: { invoke: vi.fn().mockResolvedValue(seedPortfolio) },
    savePortfolio: { invoke: vi.fn().mockResolvedValue(undefined) },
    loadDebts: { invoke: vi.fn().mockResolvedValue(seedDebts) },
    saveDebts: { invoke: vi.fn().mockResolvedValue(undefined) },
    loadBudget: { invoke: vi.fn().mockResolvedValue(seedBudget) },
    saveBudget: { invoke: vi.fn().mockResolvedValue(undefined) },
    loadGoalsSettings: { invoke: vi.fn().mockResolvedValue(seedGoalsSettings) },
    saveGoalsSettings: { invoke: vi.fn().mockResolvedValue(undefined) },
    seedPortfolio, seedDebts, seedBudget, seedGoalsSettings,
    ...overrides,
  };
}

describe("LoadInitialAppState", () => {
  it("should load every slice without seeding when the app has already been seeded", async () => {
    const dependencies = buildDependencies();
    const useCase = new LoadInitialAppState(dependencies);

    const state = await useCase.invoke();

    expect(state.portfolio).toEqual(await dependencies.loadPortfolio.invoke());
    expect(dependencies.savePortfolio.invoke).not.toHaveBeenCalled();
    expect(dependencies.saveDebts.invoke).not.toHaveBeenCalled();
    expect(dependencies.saveBudget.invoke).not.toHaveBeenCalled();
    expect(dependencies.saveGoalsSettings.invoke).not.toHaveBeenCalled();
  });

  it("should seed every slice from the seed data when goals settings have never been saved", async () => {
    let hasBeenSeeded = false;
    const dependencies = buildDependencies({
      loadGoalsSettings: {
        invoke: vi.fn().mockImplementation(async () => (hasBeenSeeded ? dependencies.seedGoalsSettings : null)),
      },
      saveGoalsSettings: { invoke: vi.fn().mockImplementation(async () => { hasBeenSeeded = true; }) },
    });
    const useCase = new LoadInitialAppState(dependencies);

    await useCase.invoke();

    expect(dependencies.savePortfolio.invoke).toHaveBeenCalledWith(dependencies.seedPortfolio);
    expect(dependencies.saveDebts.invoke).toHaveBeenCalledWith(dependencies.seedDebts);
    expect(dependencies.saveBudget.invoke).toHaveBeenCalledWith(dependencies.seedBudget);
    expect(dependencies.saveGoalsSettings.invoke).toHaveBeenCalledWith(dependencies.seedGoalsSettings);
  });

  it("should return the freshly seeded data after seeding an unseeded app", async () => {
    let hasBeenSeeded = false;
    const seedGoalsSettings: GoalsSettings = { currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0, btcConditions: { disposable: true, dcaActive: true }, countCar: true };
    const dependencies = buildDependencies({
      loadGoalsSettings: {
        invoke: vi.fn().mockImplementation(async () => (hasBeenSeeded ? seedGoalsSettings : null)),
      },
      saveGoalsSettings: { invoke: vi.fn().mockImplementation(async () => { hasBeenSeeded = true; }) },
      seedGoalsSettings,
    });
    const useCase = new LoadInitialAppState(dependencies);

    const state = await useCase.invoke();

    expect(state.goalsSettings).toEqual(seedGoalsSettings);
  });

  it("should not seed goals settings when another slice fails to seed, keeping goals_settings absent so the next load retries", async () => {
    const dependencies = buildDependencies({
      loadGoalsSettings: { invoke: vi.fn().mockResolvedValue(null) },
      saveDebts: { invoke: vi.fn().mockRejectedValue(new Error("insert failed")) },
    });
    const useCase = new LoadInitialAppState(dependencies);

    await expect(useCase.invoke()).rejects.toThrow("insert failed");

    expect(dependencies.saveGoalsSettings.invoke).not.toHaveBeenCalled();
  });

  it("should skip seeding goals settings when a concurrent request has already seeded them", async () => {
    let hasBeenSeededByConcurrentRequest = false;
    const dependencies = buildDependencies({
      loadGoalsSettings: {
        invoke: vi.fn().mockImplementation(async () => (hasBeenSeededByConcurrentRequest ? dependencies.seedGoalsSettings : null)),
      },
      savePortfolio: {
        invoke: vi.fn().mockImplementation(async () => {
          hasBeenSeededByConcurrentRequest = true;
        }),
      },
    });
    const useCase = new LoadInitialAppState(dependencies);

    await useCase.invoke();

    expect(dependencies.saveGoalsSettings.invoke).not.toHaveBeenCalled();
  });

  it("should treat an unseeded app as not seeded and run the seed step", async () => {
    const dependencies = buildDependencies({
      loadGoalsSettings: { invoke: vi.fn().mockResolvedValue(null) },
    });
    const useCase = new LoadInitialAppState(dependencies);

    await useCase.invoke();

    expect(dependencies.savePortfolio.invoke).toHaveBeenCalledWith(dependencies.seedPortfolio);
    expect(dependencies.saveGoalsSettings.invoke).toHaveBeenCalledWith(dependencies.seedGoalsSettings);
  });

  it("should propagate a null base budget without coalescing it to seed defaults", async () => {
    const dependencies = buildDependencies({
      loadBudget: {
        invoke: vi.fn().mockResolvedValue({ baseBudget: null, fixedExpenseItems: [], months: [] } satisfies BudgetSnapshot),
      },
    });
    const useCase = new LoadInitialAppState(dependencies);

    const state = await useCase.invoke();

    expect(state.budget.baseBudget).toBeNull();
  });

  it("should propagate null goals settings without coalescing them to seed defaults", async () => {
    const dependencies = buildDependencies({
      loadGoalsSettings: { invoke: vi.fn().mockResolvedValue(null) },
    });
    const useCase = new LoadInitialAppState(dependencies);

    const state = await useCase.invoke();

    expect(state.goalsSettings).toBeNull();
  });
});
