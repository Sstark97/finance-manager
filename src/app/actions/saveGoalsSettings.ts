"use server";

import { container } from "@/lib/di/ContainerDI";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

export async function saveGoalsSettings(settings: GoalsSettings): Promise<void> {
  await container.saveGoalsSettings().invoke(settings);
}
