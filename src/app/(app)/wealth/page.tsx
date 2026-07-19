import type React from "react";
import { container } from "@/lib/di/ContainerDI";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import { SectionHeader } from "@/shared/ui/SectionHeader";
import { WealthTab } from "@/features/wealth/components/WealthTab";

export default async function WealthPage(): Promise<React.JSX.Element> {
  const userId = await currentUserProvider.requireUserId();
  const [portfolio, debts, wealthTargets] = await Promise.all([
    container.loadPortfolio().invoke(userId),
    container.loadDebts().invoke(userId),
    container.loadWealthTargets().invoke(userId),
  ]);

  return (
    <>
      <SectionHeader title="Patrimonio total" />
      <WealthTab initialPortfolio={portfolio} initialWealthTargets={wealthTargets} debts={debts} />
    </>
  );
}
