"use server";

import { container } from "@/lib/di/ContainerDI";
import type { BudgetSnapshotToSave } from "@/features/budget/application/SaveBudget";

export async function saveBudget(snapshot: BudgetSnapshotToSave): Promise<void> {
  await container.saveBudget().invoke(snapshot);
}
