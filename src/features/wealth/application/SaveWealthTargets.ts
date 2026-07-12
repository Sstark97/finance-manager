import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import type { WealthTargetsRepository } from "@/features/wealth/application/WealthTargetsRepository";

export interface SaveWealthTargetsUseCase {
  invoke(userId: string, targets: WealthTargets): Promise<void>;
}

export class SaveWealthTargets implements SaveWealthTargetsUseCase {
  constructor(private readonly wealthTargetsRepository: WealthTargetsRepository) {}

  async invoke(userId: string, targets: WealthTargets): Promise<void> {
    await this.wealthTargetsRepository.save(userId, targets);
  }
}
