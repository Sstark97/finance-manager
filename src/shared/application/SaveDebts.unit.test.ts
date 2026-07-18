import { describe, expect, it } from "vitest";
import { SaveDebts } from "@/shared/application/SaveDebts";
import type { DebtRepository } from "@/shared/application/DebtRepository";
import type { Debt } from "@/shared/domain/types";

class RecordingDebtRepository implements DebtRepository {
  savedUserId: string | null = null;
  savedDebts: Debt[] | null = null;

  async findAll(): Promise<Debt[]> {
    throw new Error("not used in this test");
  }

  async saveAll(userId: string, debts: Debt[]): Promise<void> {
    this.savedUserId = userId;
    this.savedDebts = debts;
  }
}

describe("SaveDebts", () => {
  it("should persist the given debts for the given user through the repository", async () => {
    const repository = new RecordingDebtRepository();
    const useCase = new SaveDebts(repository);
    const kindle: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre", isLongTerm: false };

    await useCase.invoke("user-1", [kindle]);

    expect(repository.savedUserId).toBe("user-1");
    expect(repository.savedDebts).toEqual([kindle]);
  });
});
