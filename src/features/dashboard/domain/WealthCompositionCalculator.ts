import type { PortfolioDerived } from "@/features/wealth/domain/PortfolioCalculator";

export interface WealthCompositionSlice {
  name: string;
  value: number;
}

export class WealthCompositionCalculator {
  compose(portfolioDerived: PortfolioDerived): WealthCompositionSlice[] {
    return [
      { name: "Liquidez", value: portfolioDerived.liquidityTotal },
      { name: "Renta variable", value: portfolioDerived.equity },
      { name: "Bitcoin", value: portfolioDerived.btcTotal },
    ].filter((slice) => slice.value > 0);
  }
}

export const wealthCompositionCalculator = new WealthCompositionCalculator();
