export interface NetWorthBreakdown {
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
}

export class NetWorthCalculator {
  calculate(assetsTotal: number, liabilitiesTotal: number): NetWorthBreakdown {
    return { assetsTotal, liabilitiesTotal, netWorth: assetsTotal - liabilitiesTotal };
  }
}

export const netWorthCalculator = new NetWorthCalculator();
