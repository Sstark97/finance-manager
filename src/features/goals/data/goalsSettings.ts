import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

export const GOALS_SETTINGS_INITIAL: GoalsSettings = {
  currentSalary: 27000,
  fiContribution: 293,
  fiReturn: 0.07,
  btcSavings: 0,
  btcConditions: { disposable: true, dcaActive: true },
};
