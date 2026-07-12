import { describe, expect, it } from "vitest";
import { LoadDebts } from "@/shared/application/LoadDebts";
import type { DebtRepository } from "@/shared/application/DebtRepository";
import type { Debt } from "@/shared/domain/types";

class FakeDebtRepository implements DebtRepository {
  constructor(private readonly debtsByUserId: Record<string, Debt[]>) {}

  async findAll(userId: string): Promise<Debt[]> {
    return this.debtsByUserId[userId] ?? [];
  }

  async saveAll(): Promise<void> {
    throw new Error("not used in this test");
  }
}

describe("LoadDebts", () => {
  it("should return every debt stored in the repository for the given user", async () => {
    const carLoan: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };
    const useCase = new LoadDebts(new FakeDebtRepository({ "user-1": [carLoan] }));

    const debts = await useCase.invoke("user-1");

    expect(debts).toEqual([carLoan]);
  });

  it("should not return debts belonging to a different user", async () => {
    const carLoan: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };
    const useCase = new LoadDebts(new FakeDebtRepository({ "user-1": [carLoan] }));

    const debts = await useCase.invoke("user-2");

    expect(debts).toEqual([]);
  });
});
