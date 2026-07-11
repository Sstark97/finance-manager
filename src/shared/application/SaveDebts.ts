import type { Debt } from "@/shared/domain/types";
import type { DebtRepository } from "@/shared/application/DebtRepository";

export interface SaveDebtsUseCase {
  invoke(debts: Debt[]): Promise<void>;
}

export class SaveDebts implements SaveDebtsUseCase {
  constructor(private readonly debtRepository: DebtRepository) {}

  async invoke(debts: Debt[]): Promise<void> {
    await this.debtRepository.saveAll(debts);
  }
}
