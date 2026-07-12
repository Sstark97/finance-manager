import { describe, expect, it, vi } from "vitest";
import { LoadInitialAppState, type LoadInitialAppStateDependencies } from "@/app/LoadInitialAppState";
import type { Position } from "@/features/wealth/domain/types";
import type { Debt } from "@/shared/domain/types";
import type { BudgetSnapshot } from "@/features/budget/application/BudgetSnapshot";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";

function buildDependencies(overrides: Partial<LoadInitialAppStateDependencies> = {}): LoadInitialAppStateDependencies {
  const portfolio: Position[] = [{ id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc", equityIndex: null }];
  const debts: Debt[] = [{ id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" }];
  const budget: BudgetSnapshot = {
    baseBudget: { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 },
    fixedExpenseItems: [], months: [],
  };
  const goalsSettings: GoalsSettings = { currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0, btcConditions: { disposable: true, dcaActive: true } };
  const wealthTargets: WealthTargets = {
    emergencyFund: 4900, minimumFund: 1000,
    equityTargets: { world: 60, em: 20, nasdaq: 20 },
    btcPauseWeight: 40, btcSellWeight: 50, btcPauseCapital: 10000, btcSellCapital: 20000,
  };

  return {
    loadPortfolio: { invoke: vi.fn().mockResolvedValue(portfolio) },
    loadDebts: { invoke: vi.fn().mockResolvedValue(debts) },
    loadBudget: { invoke: vi.fn().mockResolvedValue(budget) },
    loadGoalsSettings: { invoke: vi.fn().mockResolvedValue(goalsSettings) },
    loadWealthTargets: { invoke: vi.fn().mockResolvedValue(wealthTargets) },
    ...overrides,
  };
}

describe("LoadInitialAppState", () => {
  it("should assemble the portfolio, debts, budget, goals settings and wealth targets for the given user", async () => {
    const dependencies = buildDependencies();
    const useCase = new LoadInitialAppState(dependencies);

    const state = await useCase.invoke("user-1");

    expect(state.portfolio).toEqual(await dependencies.loadPortfolio.invoke("user-1"));
    expect(state.debts).toEqual(await dependencies.loadDebts.invoke("user-1"));
    expect(state.budget).toEqual(await dependencies.loadBudget.invoke("user-1"));
    expect(state.goalsSettings).toEqual(await dependencies.loadGoalsSettings.invoke("user-1"));
    expect(state.wealthTargets).toEqual(await dependencies.loadWealthTargets.invoke("user-1"));
  });

  it("should load every slice through the given user id", async () => {
    const dependencies = buildDependencies();
    const useCase = new LoadInitialAppState(dependencies);

    await useCase.invoke("user-1");

    expect(dependencies.loadPortfolio.invoke).toHaveBeenCalledWith("user-1");
    expect(dependencies.loadDebts.invoke).toHaveBeenCalledWith("user-1");
    expect(dependencies.loadBudget.invoke).toHaveBeenCalledWith("user-1");
    expect(dependencies.loadGoalsSettings.invoke).toHaveBeenCalledWith("user-1");
    expect(dependencies.loadWealthTargets.invoke).toHaveBeenCalledWith("user-1");
  });

  it("should propagate a null base budget for a user who has never configured one", async () => {
    const dependencies = buildDependencies({
      loadBudget: {
        invoke: vi.fn().mockResolvedValue({ baseBudget: null, fixedExpenseItems: [], months: [] } satisfies BudgetSnapshot),
      },
    });
    const useCase = new LoadInitialAppState(dependencies);

    const state = await useCase.invoke("user-1");

    expect(state.budget.baseBudget).toBeNull();
  });

  it("should propagate null goals settings for a user who has never configured them", async () => {
    const dependencies = buildDependencies({
      loadGoalsSettings: { invoke: vi.fn().mockResolvedValue(null) },
    });
    const useCase = new LoadInitialAppState(dependencies);

    const state = await useCase.invoke("user-1");

    expect(state.goalsSettings).toBeNull();
  });

  it("should propagate null wealth targets for a user who has never configured them", async () => {
    const dependencies = buildDependencies({
      loadWealthTargets: { invoke: vi.fn().mockResolvedValue(null) },
    });
    const useCase = new LoadInitialAppState(dependencies);

    const state = await useCase.invoke("user-1");

    expect(state.wealthTargets).toBeNull();
  });

  it("should return empty lists for a brand new user with no stored data", async () => {
    const dependencies = buildDependencies({
      loadPortfolio: { invoke: vi.fn().mockResolvedValue([]) },
      loadDebts: { invoke: vi.fn().mockResolvedValue([]) },
    });
    const useCase = new LoadInitialAppState(dependencies);

    const state = await useCase.invoke("new-user");

    expect(state.portfolio).toEqual([]);
    expect(state.debts).toEqual([]);
  });
});
