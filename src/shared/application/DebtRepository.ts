import type { Debt } from "@/shared/domain/types";

export interface DebtRepository {
  findAll(): Promise<Debt[]>;
  saveAll(debts: Debt[]): Promise<void>;
}
