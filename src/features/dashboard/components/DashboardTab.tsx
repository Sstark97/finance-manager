"use client";

import React from "react";
import { palette } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import type { Debt } from "@/shared/domain/types";
import type { PortfolioDerived } from "@/features/wealth/domain/PortfolioCalculator";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import type { Budget, Month } from "@/features/budget/domain/types";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import { FI_GOAL } from "@/features/goals/domain/config";
import { dashboardSummaryCalculator } from "@/features/dashboard/domain/DashboardSummaryCalculator";

export interface DashboardTabProps {
  portfolioDerived: PortfolioDerived;
  debts: Debt[];
  baseBudget: Budget | null;
  months: Month[];
  goalsSettings: GoalsSettings | null;
  wealthTargets: WealthTargets | null;
}

export function DashboardTab({ portfolioDerived, debts, baseBudget, months, goalsSettings, wealthTargets }: DashboardTabProps): React.JSX.Element {
  const {
    netWorth, currentMonth, monthlyResult, fiProgress, fiProjectionMonths,
    emergencyFundMet, emergencyFundProgress, emergencyFundTarget, emergencyFundMinimum,
  } = dashboardSummaryCalculator.summarize(portfolioDerived, debts, baseBudget, months, goalsSettings, wealthTargets);
  const totalDebt = netWorth.liabilitiesTotal;

  return (
    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>

      <div className="card span-2">
        <div className="eyebrow" style={{ marginBottom:8 }}>Patrimonio neto</div>
        <div className="num disp" style={{ fontSize:32, fontWeight:600, color: netWorth.netWorth >= 0 ? palette.ink : palette.bad, marginBottom:6 }}>
          {currencyFormatter.euro(netWorth.netWorth)}
        </div>
        <div style={{ fontSize:12.5, color:palette.sub }}>
          Activos <span className="num" style={{ color:palette.ink }}>{currencyFormatter.euro(netWorth.assetsTotal)}</span>
          {" "}· Deudas <span className="num" style={{ color: totalDebt > 0 ? palette.bad : palette.ink }}>{currencyFormatter.euro(netWorth.liabilitiesTotal)}</span>
        </div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:8 }}>Flujo de este mes</div>
        {monthlyResult ? (
          <>
            <div className="num disp" style={{ fontSize:26, fontWeight:600, color: monthlyResult.surplus >= 0 ? palette.acc : palette.bad, marginBottom:6 }}>
              {currencyFormatter.euroWithCents(monthlyResult.surplus)}
            </div>
            <div style={{ fontSize:12.5, color:palette.sub, lineHeight:1.6 }}>
              Ingreso <span className="num" style={{ color:palette.ink }}>{currencyFormatter.euroWithCents(monthlyResult.income)}</span>
              {" "}− real <span className="num" style={{ color:palette.ink }}>{currencyFormatter.euroWithCents(monthlyResult.totalActual)}</span>
              {" "}= superávit de {currentMonth?.label}.
            </div>
          </>
        ) : (
          <div style={{ fontSize:12.5, color:palette.faint, lineHeight:1.6 }}>
            {baseBudget == null
              ? "Configura tu presupuesto en la pestaña Presupuesto para ver el flujo de este mes."
              : "Registra el mes actual en Presupuesto para ver aquí tu flujo mensual."}
          </div>
        )}
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:8 }}>Libertad financiera</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:22, fontWeight:600 }}>{currencyFormatter.euro(portfolioDerived.total)}</span>
          <span className="num" style={{ color:palette.faint }}>/ {currencyFormatter.euro(FI_GOAL.capital)}</span>
        </div>
        <div className="barra" style={{ marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${fiProgress}%`, background:`linear-gradient(90deg,${palette.faint},${palette.acc})` }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub }}>
          {currencyFormatter.percent(fiProgress)} del objetivo
          {fiProjectionMonths != null && ` · a este ritmo, ~${(fiProjectionMonths / 12).toFixed(1)} años`}
        </div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:8 }}>Fondo de emergencia</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:22, fontWeight:600 }}>{currencyFormatter.euro(portfolioDerived.liquidityTotal)}</span>
          <span className="num" style={{ color:palette.faint }}>/ {currencyFormatter.euro(emergencyFundTarget)}</span>
        </div>
        <div className="barra" style={{ marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${emergencyFundProgress}%`, background: emergencyFundMet ? palette.acc : palette.bad }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub }}>
          {emergencyFundMet ? "Mínimo intocable cubierto." : `Por debajo del mínimo de ${currencyFormatter.euro(emergencyFundMinimum)}.`}
        </div>
      </div>
    </div>
  );
}
