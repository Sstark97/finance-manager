import type { Debt } from "@/shared/domain/types";
import type { DebtRepository } from "@/shared/application/DebtRepository";

export interface LoadDebtsUseCase {
  invoke(userId: string): Promise<Debt[]>;
}

export class LoadDebts implements LoadDebtsUseCase {
  constructor(private readonly debtRepository: DebtRepository) {}

  async invoke(userId: string): Promise<Debt[]> {
    return this.debtRepository.findAll(userId);
  }
}
