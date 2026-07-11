"use server";

import { container } from "@/lib/di/ContainerDI";
import type { Position } from "@/features/wealth/domain/types";

export async function savePortfolio(positions: Position[]): Promise<void> {
  await container.savePortfolio().invoke(positions);
}
