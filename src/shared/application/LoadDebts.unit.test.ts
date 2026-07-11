import { describe, expect, it } from "vitest";
import { LoadDebts } from "@/shared/application/LoadDebts";
import type { DebtRepository } from "@/shared/application/DebtRepository";
import type { Debt } from "@/shared/domain/types";

class FakeDebtRepository implements DebtRepository {
  constructor(private readonly debts: Debt[]) {}

  async findAll(): Promise<Debt[]> {
    return this.debts;
  }

  async saveAll(): Promise<void> {
    throw new Error("not used in this test");
  }
}

describe("LoadDebts", () => {
  it("should return every debt stored in the repository", async () => {
    const carLoan: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };
    const useCase = new LoadDebts(new FakeDebtRepository([carLoan]));

    const debts = await useCase.invoke();

    expect(debts).toEqual([carLoan]);
  });
});
