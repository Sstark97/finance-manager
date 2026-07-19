"use client";

import React, { useState, useEffect, useRef } from "react";
import type { FixedExpenseItem, Month, Budget } from "@/features/budget/domain/types";
import { monthFactory } from "@/features/budget/domain/MonthFactory";
import { BudgetOnboarding } from "@/features/budget/components/BudgetOnboarding";
import { BudgetWorkspace } from "@/features/budget/components/BudgetWorkspace";
import { saveBudget } from "@/app/actions/saveBudget";

export interface BudgetTabProps {
  initialBaseBudget: Budget | null;
  initialFixedExpenseItems: FixedExpenseItem[];
  initialMonths: Month[];
}

const PERSIST_DEBOUNCE_MS = 800;

export function BudgetTab({ initialBaseBudget, initialFixedExpenseItems, initialMonths }: BudgetTabProps): React.JSX.Element {
  const [baseBudget, setBaseBudget] = useState<Budget | null>(initialBaseBudget);
  const [months, setMonths] = useState<Month[]>(initialMonths);
  const [fixedExpenseItems, setFixedExpenseItems] = useState<FixedExpenseItem[]>(initialFixedExpenseItems);

  const pendingBudgetFlush = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      pendingBudgetFlush.current?.();
    };
  }, []);

  const isFirstBudgetRun = useRef(true);
  useEffect(() => {
    if (isFirstBudgetRun.current) { isFirstBudgetRun.current = false; return; }
    if (baseBudget == null) return;
    const persistBudget = (): void => {
      pendingBudgetFlush.current = null;
      saveBudget({ baseBudget, fixedExpenseItems, months }).catch((error: unknown) => console.error("Failed to persist budget", error));
    };
    pendingBudgetFlush.current = persistBudget;
    const timeoutId = setTimeout(persistBudget, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [baseBudget, fixedExpenseItems, months]);

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
