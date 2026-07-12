import { describe, expect, it } from "vitest";
import { WealthTargetsRowMapper } from "@/features/wealth/infrastructure/WealthTargetsRowMapper";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";

describe("WealthTargetsRowMapper", () => {
  const mapper = new WealthTargetsRowMapper();
  const targets: WealthTargets = {
    emergencyFund: 4900, minimumFund: 1000,
    equityTargets: { world: 60, em: 20, nasdaq: 20 },
    btcPauseWeight: 40, btcSellWeight: 50, btcPauseCapital: 10000, btcSellCapital: 20000,
  };

  it("should nest the flattened equity target columns back into equityTargets", () => {
    const row = {
      userId: "user-1", emergencyFund: 4900, minimumFund: 1000,
      equityTargetWorld: 60, equityTargetEm: 20, equityTargetNasdaq: 20,
      btcPauseWeight: 40, btcSellWeight: 50, btcPauseCapital: 10000, btcSellCapital: 20000,
    };

    expect(mapper.toDomain(row)).toEqual(targets);
  });

  it("should flatten equityTargets into row columns keyed by the owning user", () => {
    const row = mapper.toRow(targets, "user-1");

    expect(row).toEqual({
      userId: "user-1", emergencyFund: 4900, minimumFund: 1000,
      equityTargetWorld: 60, equityTargetEm: 20, equityTargetNasdaq: 20,
      btcPauseWeight: 40, btcSellWeight: 50, btcPauseCapital: 10000, btcSellCapital: 20000,
    });
  });
});
