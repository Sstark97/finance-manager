import type { PortfolioDerived } from "@/features/wealth/domain/PortfolioCalculator";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";

const WORLD_WEIGHT_DEVIATION_ALERT_THRESHOLD = 8;

export interface WealthThresholdStatus {
  isEmergencyFundBelowMinimum: boolean;
  isEmergencyFundComplete: boolean;
  isBitcoinAtSellThreshold: boolean;
  isBitcoinAtPauseThreshold: boolean;
  worldWeightDeviation: number;
  isWorldWeightDeviated: boolean;
}

export class WealthThresholdEvaluator {
  evaluate(portfolioDerived: PortfolioDerived, targets: WealthTargets): WealthThresholdStatus {
    const { liquidityTotal, btcWeightTotal, total, equity, equityWeightOf } = portfolioDerived;

    const isBitcoinAtSellThreshold = btcWeightTotal > targets.btcSellWeight && total > targets.btcSellCapital;
    const isBitcoinAtPauseThreshold = !isBitcoinAtSellThreshold
      && btcWeightTotal > targets.btcPauseWeight && total > targets.btcPauseCapital;
    const worldWeightDeviation = Math.abs(equityWeightOf("world") - targets.equityTargets.world);

    return {
      isEmergencyFundBelowMinimum: liquidityTotal < targets.minimumFund,
      isEmergencyFundComplete: liquidityTotal >= targets.emergencyFund,
      isBitcoinAtSellThreshold,
      isBitcoinAtPauseThreshold,
      worldWeightDeviation,
      isWorldWeightDeviated: equity > 0 && worldWeightDeviation > WORLD_WEIGHT_DEVIATION_ALERT_THRESHOLD,
    };
  }
}

export const wealthThresholdEvaluator = new WealthThresholdEvaluator();
