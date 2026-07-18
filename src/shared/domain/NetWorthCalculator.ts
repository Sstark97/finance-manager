export interface NetWorthBreakdown {
  assetsTotal: number;
  shortTermLiabilitiesTotal: number;
  longTermLiabilitiesTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
  netWorthIncludingAllDebt: number;
}

export class NetWorthCalculator {
  calculate(assetsTotal: number, shortTermLiabilitiesTotal: number, longTermLiabilitiesTotal: number): NetWorthBreakdown {
    const liabilitiesTotal = shortTermLiabilitiesTotal + longTermLiabilitiesTotal;
    return {
      assetsTotal,
      shortTermLiabilitiesTotal,
      longTermLiabilitiesTotal,
      liabilitiesTotal,
      netWorth: assetsTotal - shortTermLiabilitiesTotal,
      netWorthIncludingAllDebt: assetsTotal - liabilitiesTotal,
    };
  }
}

export const netWorthCalculator = new NetWorthCalculator();
