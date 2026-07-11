"use server";

import { getSaveDebts } from "@/lib/di/container";
import type { Debt } from "@/shared/domain/types";

export async function saveDebts(debts: Debt[]): Promise<void> {
  await getSaveDebts().invoke(debts);
}
