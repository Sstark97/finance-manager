"use server";

import { container } from "@/lib/di/ContainerDI";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";

export async function saveGoalsSettings(settings: GoalsSettings): Promise<void> {
  const userId = await currentUserProvider.requireUserId();
  await container.saveGoalsSettings().invoke(userId, settings);
}
