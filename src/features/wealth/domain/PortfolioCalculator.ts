import type { EquityIndexKey, Position } from "@/features/wealth/domain/types";

export interface PositionWithValue extends Position {
  value: number;
}

export interface PortfolioDerived {
  withValue: PositionWithValue[];
  total: number;
  invested: number;
  liquidityTotal: number;
  equityItems: PositionWithValue[];
  equity: number;
  btcTotal: number;
  btcWeightTotal: number;
  equityWeightOf: (equityIndex: EquityIndexKey) => number;
}

export class PortfolioCalculator {
  derive(portfolio: Position[]): PortfolioDerived {
    const withValue: PositionWithValue[] = portfolio.map((position) => ({
      ...position,
      value: position.type === "efectivo"
        ? (position.units || 0)
        : (position.units || 0) * (position.price || 0),
    }));
    const total = withValue.reduce((sum, position) => sum + position.value, 0);
    const invested = withValue.filter(position => position.group !== "liquidez").reduce((sum, position) => sum + position.value, 0);
    const liquidityTotal = withValue.filter(position => position.group === "liquidez").reduce((sum, position) => sum + position.value, 0);
    const equityItems = withValue.filter(position => position.group === "rv");
    const equity = equityItems.reduce((sum, position) => sum + position.value, 0);
    const btcTotal = withValue.filter(position => position.group === "btc").reduce((sum, position) => sum + position.value, 0);
    const btcWeightTotal = total ? (btcTotal / total) * 100 : 0;
    const equityWeightOf = (equityIndex: EquityIndexKey): number => {
      const trackedValue = equityItems
        .filter(item => item.equityIndex === equityIndex)
        .reduce((sum, item) => sum + item.value, 0);
      return equity ? (trackedValue / equity) * 100 : 0;
    };
    return { withValue, total, invested, liquidityTotal, equityItems, equity, btcTotal, btcWeightTotal, equityWeightOf };
  }
}

export const portfolioCalculator = new PortfolioCalculator();
