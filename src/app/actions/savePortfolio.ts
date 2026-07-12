"use server";

import { container } from "@/lib/di/ContainerDI";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import type { Position } from "@/features/wealth/domain/types";

export async function savePortfolio(positions: Position[]): Promise<void> {
  const userId = await currentUserProvider.requireUserId();
  await container.savePortfolio().invoke(userId, positions);
}
