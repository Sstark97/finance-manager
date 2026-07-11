"use server";

import { getSaveGoalsSettings } from "@/lib/di/container";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

export async function saveGoalsSettings(settings: GoalsSettings): Promise<void> {
  await getSaveGoalsSettings().invoke(settings);
}
