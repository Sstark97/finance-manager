import type { Month } from "@/features/budget/domain/types";

export interface MonthRepository {
  findAll(): Promise<Month[]>;
  saveAll(months: Month[]): Promise<void>;
}
