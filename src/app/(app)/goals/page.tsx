import type React from "react";
import { container } from "@/lib/di/ContainerDI";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import { SectionHeader } from "@/shared/ui/SectionHeader";
import { GoalsTab } from "@/features/goals/components/GoalsTab";

export default async function GoalsPage(): Promise<React.JSX.Element> {
  const userId = await currentUserProvider.requireUserId();
  const [portfolio, goalsSettings, wealthTargets] = await Promise.all([
    container.loadPortfolio().invoke(userId),
    container.loadGoalsSettings().invoke(userId),
    container.loadWealthTargets().invoke(userId),
  ]);

  return (
    <>
      <SectionHeader title="Metas y plan" />
      <GoalsTab
        portfolio={portfolio}
        initialSettings={goalsSettings}
        wealthTargets={wealthTargets}
      />
    </>
  );
}
