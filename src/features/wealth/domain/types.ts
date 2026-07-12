export type PositionType = "fondo" | "etf" | "cripto" | "efectivo";
export type PositionGroup = "rv" | "btc" | "liquidez";
export type EquityIndexKey = "world" | "em" | "nasdaq";

export interface Position {
  id: string;
  name: string;
  ticker: string;
  type: PositionType;
  units: number;
  price: number;
  group: PositionGroup;
  equityIndex: EquityIndexKey | null;
}

export interface PortfolioHistoryPoint {
  label: string;
  total: number;
}

export interface CompositionItem {
  name: string;
  value: number;
}

export interface Composition {
  name: string;
  countries: CompositionItem[];
  sectors: CompositionItem[];
}
