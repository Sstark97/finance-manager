import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";

export const WEALTH_TARGETS_INITIAL: WealthTargets = {
  emergencyFund: 4900,
  minimumFund: 1000,
  equityTargets: { world: 60, em: 20, nasdaq: 20 },
  btcPauseWeight: 40,
  btcSellWeight: 50,
  btcPauseCapital: 10000,
  btcSellCapital: 20000,
};
