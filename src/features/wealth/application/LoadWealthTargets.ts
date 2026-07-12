import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import type { WealthTargetsRepository } from "@/features/wealth/application/WealthTargetsRepository";

export interface LoadWealthTargetsUseCase {
  invoke(userId: string): Promise<WealthTargets | null>;
}

export class LoadWealthTargets implements LoadWealthTargetsUseCase {
  constructor(private readonly wealthTargetsRepository: WealthTargetsRepository) {}

  async invoke(userId: string): Promise<WealthTargets | null> {
    return this.wealthTargetsRepository.find(userId);
  }
}
