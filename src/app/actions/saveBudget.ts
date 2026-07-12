"use server";

import { container } from "@/lib/di/ContainerDI";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import type { BudgetSnapshotToSave } from "@/features/budget/application/SaveBudget";

export async function saveBudget(snapshot: BudgetSnapshotToSave): Promise<void> {
  const userId = await currentUserProvider.requireUserId();
  await container.saveBudget().invoke(userId, snapshot);
}
