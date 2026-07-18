"use client";

import React from "react";
import { palette } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import type { Month, Budget } from "@/features/budget/domain/types";
import { monthlyRecapCalculator } from "@/features/budget/domain/MonthlyRecapCalculator";

export interface MonthlyRecapCardProps {
  month: Month;
  months: Month[];
  baseBudget: Budget;
}

function formatSignedAmount(amount: number): string {
  return `${amount >= 0 ? "+" : ""}${currencyFormatter.euroWithCents(amount)}`;
}

export function MonthlyRecapCard({ month, months, baseBudget }: MonthlyRecapCardProps): React.JSX.Element {
  const recap = monthlyRecapCalculator.calculate(month, months, baseBudget);
  const { result, overspentCategories, previousMonth, surplusDeltaVsPreviousMonth, incomeDeltaVsPreviousMonth, totalActualDeltaVsPreviousMonth } = recap;

  const hasComparison = previousMonth != null
    && surplusDeltaVsPreviousMonth != null
    && incomeDeltaVsPreviousMonth != null
    && totalActualDeltaVsPreviousMonth != null;

  return (
    <div className="card span-full">
      <div className="eyebrow" style={{ marginBottom: 14 }}>Cómo ha ido {month.label}</div>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: palette.faint, marginBottom: 4 }}>Superávit del mes</div>
          <div className="num disp" style={{ fontSize: 26, fontWeight: 600, color: result.surplus >= 0 ? palette.acc : palette.bad }}>
            {currencyFormatter.euroWithCents(result.surplus)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: palette.faint, marginBottom: 4 }}>Categorías sobrepasadas</div>
          <div className="num disp" style={{ fontSize: 26, fontWeight: 600, color: overspentCategories.length > 0 ? palette.warn : palette.acc }}>
            {overspentCategories.length}
          </div>
        </div>
      </div>

      {overspentCategories.length === 0 ? (
        <div style={{ fontSize: 12.5, color: palette.sub, marginBottom: 16 }}>Ninguna categoría se ha pasado de presupuesto este mes.</div>
      ) : (
        <ul style={{ margin: "0 0 16px", padding: 0, listStyle: "none" }}>
          {overspentCategories.map(category => (
            <li key={category.categoryId} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: palette.ink, marginBottom: 6 }}>
              <span>{category.categoryName} se pasó del plan</span>
              <span className="num" style={{ color: palette.warn }}>+{currencyFormatter.euroWithCents(category.overspentBy)}</span>
            </li>
          ))}
        </ul>
      )}

      <div style={{ paddingTop: 14, borderTop: `1px solid ${palette.line}`, fontSize: 12.5, color: palette.sub, lineHeight: 1.6 }}>
        {hasComparison ? (
          <>
            Frente a {previousMonth.label}: ingreso <span className="num">{formatSignedAmount(incomeDeltaVsPreviousMonth)}</span>,
            {" "}gasto real <span className="num">{formatSignedAmount(totalActualDeltaVsPreviousMonth)}</span>,
            {" "}superávit <span className="num">{formatSignedAmount(surplusDeltaVsPreviousMonth)}</span>.
          </>
        ) : (
          "Aún no hay un mes anterior registrado con el que comparar."
        )}
      </div>
    </div>
  );
}
