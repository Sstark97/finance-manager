"use server";

import { container } from "@/lib/di/ContainerDI";
import type { Debt } from "@/shared/domain/types";

export async function saveDebts(debts: Debt[]): Promise<void> {
  await container.saveDebts().invoke(debts);
}
