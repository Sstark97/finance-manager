import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import type { wealthTargets } from "@/infrastructure/db/schema";

type WealthTargetsRow = typeof wealthTargets.$inferSelect;
type NewWealthTargetsRow = typeof wealthTargets.$inferInsert;

export class WealthTargetsRowMapper {
  toDomain(row: WealthTargetsRow): WealthTargets {
    return {
      emergencyFund: row.emergencyFund,
      minimumFund: row.minimumFund,
      equityTargets: {
        world: row.equityTargetWorld,
        em: row.equityTargetEm,
        nasdaq: row.equityTargetNasdaq,
      },
      btcPauseWeight: row.btcPauseWeight,
      btcSellWeight: row.btcSellWeight,
      btcPauseCapital: row.btcPauseCapital,
      btcSellCapital: row.btcSellCapital,
    };
  }

  toRow(targets: WealthTargets, userId: string): NewWealthTargetsRow {
    return {
      userId,
      emergencyFund: targets.emergencyFund,
      minimumFund: targets.minimumFund,
      equityTargetWorld: targets.equityTargets.world,
      equityTargetEm: targets.equityTargets.em,
      equityTargetNasdaq: targets.equityTargets.nasdaq,
      btcPauseWeight: targets.btcPauseWeight,
      btcSellWeight: targets.btcSellWeight,
      btcPauseCapital: targets.btcPauseCapital,
      btcSellCapital: targets.btcSellCapital,
    };
  }
}
