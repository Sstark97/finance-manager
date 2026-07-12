import type { PositionTransaction } from "@/features/wealth/domain/PositionTransaction";

export interface PositionTransactionRepository {
  findByPositionId(userId: string, positionId: string): Promise<PositionTransaction[]>;
  save(userId: string, transaction: PositionTransaction): Promise<void>;
}
