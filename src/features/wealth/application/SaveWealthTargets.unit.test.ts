import { describe, expect, it } from "vitest";
import { SaveWealthTargets } from "@/features/wealth/application/SaveWealthTargets";
import type { WealthTargetsRepository } from "@/features/wealth/application/WealthTargetsRepository";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";

class RecordingWealthTargetsRepository implements WealthTargetsRepository {
  savedUserId: string | null = null;
  savedTargets: WealthTargets | null = null;

  async find(): Promise<WealthTargets> {
    throw new Error("not used in this test");
  }

  async save(userId: string, targets: WealthTargets): Promise<void> {
    this.savedUserId = userId;
    this.savedTargets = targets;
  }
}

describe("SaveWealthTargets", () => {
  it("should persist the given targets for the given user through the repository", async () => {
    const repository = new RecordingWealthTargetsRepository();
    const useCase = new SaveWealthTargets(repository);
    const targets: WealthTargets = {
      emergencyFund: 4900, minimumFund: 1000,
      equityTargets: { world: 60, em: 20, nasdaq: 20 },
      btcPauseWeight: 40, btcSellWeight: 50, btcPauseCapital: 10000, btcSellCapital: 20000,
    };

    await useCase.invoke("user-1", targets);

    expect(repository.savedUserId).toBe("user-1");
    expect(repository.savedTargets).toEqual(targets);
  });
});
