import { describe, expect, it } from "vitest";
import { SaveDebts } from "@/shared/application/SaveDebts";
import type { DebtRepository } from "@/shared/application/DebtRepository";
import type { Debt } from "@/shared/domain/types";

class RecordingDebtRepository implements DebtRepository {
  savedDebts: Debt[] | null = null;

  async findAll(): Promise<Debt[]> {
    throw new Error("not used in this test");
  }

  async saveAll(debts: Debt[]): Promise<void> {
    this.savedDebts = debts;
  }
}

describe("SaveDebts", () => {
  it("should persist the given debts through the repository", async () => {
    const repository = new RecordingDebtRepository();
    const useCase = new SaveDebts(repository);
    const kindle: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre" };

    await useCase.invoke([kindle]);

    expect(repository.savedDebts).toEqual([kindle]);
  });
});
