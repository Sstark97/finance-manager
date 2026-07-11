"use server";

import { getSaveBudget } from "@/lib/di/container";
import type { BudgetSnapshot } from "@/features/budget/application/BudgetSnapshot";

export async function saveBudget(snapshot: BudgetSnapshot): Promise<void> {
  await getSaveBudget().invoke(snapshot);
}
