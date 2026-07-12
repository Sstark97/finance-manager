export interface EquityTargets {
  world: number;
  em: number;
  nasdaq: number;
}

export interface WealthTargets {
  emergencyFund: number;
  minimumFund: number;
  equityTargets: EquityTargets;
  btcPauseWeight: number;
  btcSellWeight: number;
  btcPauseCapital: number;
  btcSellCapital: number;
}
