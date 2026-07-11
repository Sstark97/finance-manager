import type { BtcConditions } from "@/features/goals/domain/types";

export interface GoalsSettings {
  currentSalary: number;
  fiContribution: number;
  fiReturn: number;
  btcSavings: number;
  btcConditions: BtcConditions;
  countCar: boolean;
}
