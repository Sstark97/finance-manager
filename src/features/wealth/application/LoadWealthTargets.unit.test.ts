import { describe, expect, it } from "vitest";
import { LoadWealthTargets } from "@/features/wealth/application/LoadWealthTargets";
import type { WealthTargetsRepository } from "@/features/wealth/application/WealthTargetsRepository";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";

class FakeWealthTargetsRepository implements WealthTargetsRepository {
  constructor(private readonly targets: WealthTargets | null) {}

  async find(): Promise<WealthTargets | null> {
    return this.targets;
  }

  async save(): Promise<void> {
    throw new Error("not used in this test");
  }
}

describe("LoadWealthTargets", () => {
  it("should return the targets stored in the repository for the given user", async () => {
    const targets: WealthTargets = {
      emergencyFund: 4900, minimumFund: 1000,
      equityTargets: { world: 60, em: 20, nasdaq: 20 },
      btcPauseWeight: 40, btcSellWeight: 50, btcPauseCapital: 10000, btcSellCapital: 20000,
    };
    const useCase = new LoadWealthTargets(new FakeWealthTargetsRepository(targets));

    const result = await useCase.invoke("user-1");

    expect(result).toEqual(targets);
  });

  it("should propagate null when the targets have not been configured yet", async () => {
    const useCase = new LoadWealthTargets(new FakeWealthTargetsRepository(null));

    const result = await useCase.invoke("user-1");

    expect(result).toBeNull();
  });
});
