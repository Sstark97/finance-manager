import type { Month } from "@/features/budget/domain/types";

export interface MonthRepository {
  findAll(userId: string): Promise<Month[]>;
  saveAll(userId: string, months: Month[]): Promise<void>;
}
