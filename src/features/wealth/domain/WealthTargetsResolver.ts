import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import { WEALTH_TARGETS_INITIAL } from "@/features/wealth/data/wealthTargets";

export class WealthTargetsResolver {
  resolve(wealthTargets: WealthTargets | null): WealthTargets {
    return wealthTargets ?? WEALTH_TARGETS_INITIAL;
  }
}

export const wealthTargetsResolver = new WealthTargetsResolver();
