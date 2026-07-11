export type PositionTransactionKind = "buy" | "sell";

export interface PositionTransaction {
  id: string;
  positionId: string;
  kind: PositionTransactionKind;
  executedAt: Date;
  units: number;
  price: number;
  fee?: number;
}
