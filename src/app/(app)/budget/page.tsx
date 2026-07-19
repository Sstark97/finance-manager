import type React from "react";
import { container } from "@/lib/di/ContainerDI";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import { SectionHeader } from "@/shared/ui/SectionHeader";
import { BudgetTab } from "@/features/budget/components/BudgetTab";

export default async function BudgetPage(): Promise<React.JSX.Element> {
  const userId = await currentUserProvider.requireUserId();
  const budget = await container.loadBudget().invoke(userId);

  return (
    <>
      <SectionHeader title="Presupuesto" />
      <BudgetTab
        initialBaseBudget={budget.baseBudget}
        initialFixedExpenseItems={budget.fixedExpenseItems}
        initialMonths={budget.months}
      />
    </>
  );
}
