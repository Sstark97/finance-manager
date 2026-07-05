export interface AssetPricePoint {
  timestamp: number; // epoch seconds of the bar
  close: number;     // close in the instrument's native currency
}

export interface AssetPriceHistory {
  ticker: string;
  currency: string;          // ISO-4217 native currency of the closes
  gmtOffsetSeconds: number;  // meta.gmtoffset — used for exchange-local daily bucketing
  points: AssetPricePoint[]; // chronological; may hold a single synthetic point for funds
}
