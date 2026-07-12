import type { Debt } from "@/shared/domain/types";

export interface DebtRepository {
  findAll(userId: string): Promise<Debt[]>;
  saveAll(userId: string, debts: Debt[]): Promise<void>;
}
