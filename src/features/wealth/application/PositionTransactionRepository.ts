import type { PositionTransaction } from "@/features/wealth/domain/PositionTransaction";

export interface PositionTransactionRepository {
  findByPositionId(positionId: string): Promise<PositionTransaction[]>;
  save(transaction: PositionTransaction): Promise<void>;
}
