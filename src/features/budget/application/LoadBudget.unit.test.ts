import { describe, expect, it } from "vitest";
import { LoadBudget } from "@/features/budget/application/LoadBudget";
import type { BudgetRepository } from "@/features/budget/application/BudgetRepository";
import type { MonthRepository } from "@/features/budget/application/MonthRepository";
import type { Budget, FixedExpenseItem, Month } from "@/features/budget/domain/types";

class FakeBudgetRepository implements BudgetRepository {
  constructor(private readonly base: Budget | null, private readonly items: FixedExpenseItem[]) {}

  async findBase(): Promise<Budget | null> {
    return this.base;
  }

  async saveBase(): Promise<void> {
    throw new Error("not used in this test");
  }

  async findFixedExpenseItems(): Promise<FixedExpenseItem[]> {
    return this.items;
  }

  async saveFixedExpenseItems(): Promise<void> {
    throw new Error("not used in this test");
  }
}

class FakeMonthRepository implements MonthRepository {
  constructor(private readonly months: Month[]) {}

  async findAll(): Promise<Month[]> {
    return this.months;
  }

  async saveAll(): Promise<void> {
    throw new Error("not used in this test");
  }
}

describe("LoadBudget", () => {
  it("should assemble the base budget, fixed expense items and months from their repositories", async () => {
    const baseBudget: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };
    const fixedExpenseItems: FixedExpenseItem[] = [{ id: "coche", name: "Coche", amount: 173.28 }];
    const months: Month[] = [{ id: "month-1", date: new Date("2026-06-01"), label: "jun 26", overrides: {}, movements: [], events: [], netIncomeOverride: null }];
    const useCase = new LoadBudget(new FakeBudgetRepository(baseBudget, fixedExpenseItems), new FakeMonthRepository(months));

    const snapshot = await useCase.invoke("user-1");

    expect(snapshot).toEqual({ baseBudget, fixedExpenseItems, months });
  });

  it("should propagate a null base budget when it has not been configured yet", async () => {
    const useCase = new LoadBudget(new FakeBudgetRepository(null, []), new FakeMonthRepository([]));

    const snapshot = await useCase.invoke("user-1");

    expect(snapshot.baseBudget).toBeNull();
  });
});
