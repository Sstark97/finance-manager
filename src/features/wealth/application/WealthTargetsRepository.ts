import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";

export interface WealthTargetsRepository {
  find(userId: string): Promise<WealthTargets | null>;
  save(userId: string, targets: WealthTargets): Promise<void>;
}
