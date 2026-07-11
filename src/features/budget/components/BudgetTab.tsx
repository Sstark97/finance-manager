"use client";

import React from "react";
import type { FixedExpenseItem, Month, Budget } from "@/features/budget/domain/types";
import { monthFactory } from "@/features/budget/domain/MonthFactory";
import { BudgetOnboarding } from "@/features/budget/components/BudgetOnboarding";
import { BudgetWorkspace } from "@/features/budget/components/BudgetWorkspace";

export interface BudgetTabProps {
  baseBudget: Budget | null;
  setBaseBudget: React.Dispatch<React.SetStateAction<Budget | null>>;
  months: Month[];
  setMonths: React.Dispatch<React.SetStateAction<Month[]>>;
  fixedExpenseItems: FixedExpenseItem[];
  setFixedExpenseItems: React.Dispatch<React.SetStateAction<FixedExpenseItem[]>>;
}

export function BudgetTab({ baseBudget, setBaseBudget, months, setMonths, fixedExpenseItems, setFixedExpenseItems }: BudgetTabProps): React.JSX.Element {
  if (baseBudget == null) {
    return (
      <BudgetOnboarding
        onCreateBudget={(budget, items) => {
          setBaseBudget(budget);
          setFixedExpenseItems(items);
          setMonths(previousMonths => (previousMonths.length > 0 ? previousMonths : [monthFactory.createCurrent()]));
        }}
      />
    );
  }

  return (
    <BudgetWorkspace
      baseBudget={baseBudget}
      setBaseBudget={setBaseBudget}
      months={months}
      setMonths={setMonths}
      fixedExpenseItems={fixedExpenseItems}
      setFixedExpenseItems={setFixedExpenseItems}
    />
  );
}
