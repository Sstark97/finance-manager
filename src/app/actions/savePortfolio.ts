"use server";

import { getSavePortfolio } from "@/lib/di/container";
import type { Position } from "@/features/wealth/domain/types";

export async function savePortfolio(positions: Position[]): Promise<void> {
  await getSavePortfolio().invoke(positions);
}
