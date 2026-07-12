"use server";

import { container } from "@/lib/di/ContainerDI";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";

export async function saveWealthTargets(targets: WealthTargets): Promise<void> {
  const userId = await currentUserProvider.requireUserId();
  await container.saveWealthTargets().invoke(userId, targets);
}
