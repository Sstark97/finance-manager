"use server";

import { container } from "@/lib/di/ContainerDI";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import type { Debt } from "@/shared/domain/types";

export async function saveDebts(debts: Debt[]): Promise<void> {
  const userId = await currentUserProvider.requireUserId();
  await container.saveDebts().invoke(userId, debts);
}
