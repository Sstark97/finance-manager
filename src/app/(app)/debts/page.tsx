import type React from "react";
import { container } from "@/lib/di/ContainerDI";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import { portfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import { SectionHeader } from "@/shared/ui/SectionHeader";
import { DebtsSection } from "@/features/debts/components/DebtsSection";

export default async function DebtsPage(): Promise<React.JSX.Element> {
  const userId = await currentUserProvider.requireUserId();
  const [portfolio, debts] = await Promise.all([
    container.loadPortfolio().invoke(userId),
    container.loadDebts().invoke(userId),
  ]);
  const portfolioTotal = portfolioCalculator.derive(portfolio).total;

  return (
    <>
      <SectionHeader title="Deudas" />
      <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>
        <DebtsSection initialDebts={debts} portfolioTotal={portfolioTotal} />
      </div>
    </>
  );
}
