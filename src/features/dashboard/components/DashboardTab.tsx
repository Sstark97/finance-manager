"use client";

import React from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { palette, seriesColorAt } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import type { Debt } from "@/shared/domain/types";
import type { Position } from "@/features/wealth/domain/types";
import type { PortfolioDerived } from "@/features/wealth/domain/PortfolioCalculator";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import type { Budget, Month } from "@/features/budget/domain/types";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import { FI_GOAL } from "@/features/goals/domain/config";
import { dashboardSummaryCalculator } from "@/features/dashboard/domain/DashboardSummaryCalculator";
import { wealthCompositionCalculator } from "@/features/dashboard/domain/WealthCompositionCalculator";
import { surplusHistoryCalculator } from "@/features/dashboard/domain/SurplusHistoryCalculator";
import { WealthEvolutionChart } from "@/features/wealth/components/WealthEvolutionChart";

export interface DashboardTabProps {
  portfolio: Position[];
  portfolioDerived: PortfolioDerived;
  debts: Debt[];
  baseBudget: Budget | null;
  months: Month[];
  goalsSettings: GoalsSettings | null;
  wealthTargets: WealthTargets | null;
}

export function DashboardTab({ portfolio, portfolioDerived, debts, baseBudget, months, goalsSettings, wealthTargets }: DashboardTabProps): React.JSX.Element {
  const {
    netWorth, currentMonth, monthlyResult, fiProgress, fiProjectionMonths,
    emergencyFundMet, emergencyFundProgress, emergencyFundTarget, emergencyFundMinimum,
  } = dashboardSummaryCalculator.summarize(portfolioDerived, debts, baseBudget, months, goalsSettings, wealthTargets);

  const wealthComposition = wealthCompositionCalculator.compose(portfolioDerived)
    .map((slice, index) => ({ ...slice, color: seriesColorAt(index) }));
  const surplusHistory = baseBudget ? surplusHistoryCalculator.calculateRecentMonths(months, baseBudget) : [];
  const hasIncompleteSurplusHistory = surplusHistory.length > 0 && surplusHistory.length < 2;

  return (
    <div className="grid" style={{ gridTemplateColumns:"1fr" }}>

      <div className="grid">
        <div className="card span-full">
          <div className="eyebrow" style={{ marginBottom:8 }}>Patrimonio neto</div>
          <div className="num disp" style={{ fontSize:32, fontWeight:600, color: netWorth.netWorth >= 0 ? palette.ink : palette.bad, marginBottom:6 }}>
            {currencyFormatter.euro(netWorth.netWorth)}
          </div>
          <div style={{ fontSize:12.5, color:palette.sub }}>
            Activos <span className="num" style={{ color:palette.ink }}>{currencyFormatter.euro(netWorth.assetsTotal)}</span>
            {" "}· Deudas a corto plazo <span className="num" style={{ color: netWorth.shortTermLiabilitiesTotal > 0 ? palette.bad : palette.ink }}>{currencyFormatter.euro(netWorth.shortTermLiabilitiesTotal)}</span>
          </div>
          <div style={{ marginTop:6, fontSize:12.5 }} className="num">
            <span style={{ color:palette.sub }}>Patrimonio neto con toda la deuda: </span>
            <span style={{ color: netWorth.netWorthIncludingAllDebt >= 0 ? palette.ink : palette.bad, fontWeight:600 }}>{currencyFormatter.euro(netWorth.netWorthIncludingAllDebt)}</span>
          </div>
        </div>
      </div>

      <div className="grid">
        <WealthEvolutionChart portfolio={portfolio} total={portfolioDerived.total} liquidityTotal={portfolioDerived.liquidityTotal} />
      </div>

      <div className="grid dashboard-metrics-row" style={{ gridTemplateColumns:"repeat(3,1fr)" }}>
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

      <div className="grid dashboard-charts-row" style={{ gridTemplateColumns:"repeat(2,1fr)", alignItems:"stretch" }}>
        <div className="card" style={{ display:"flex", flexDirection:"column" }}>
          <div className="eyebrow" style={{ marginBottom:8 }}>Composición del patrimonio</div>
          {wealthComposition.length === 0 ? (
            <div style={{ height:180, display:"flex", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"0 16px", color:palette.faint, fontSize:12.5, lineHeight:1.5 }}>
              Sin posiciones todavía. La composición aparecerá aquí en cuanto añadas tu primera posición.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={wealthComposition} dataKey="value" nameKey="name" innerRadius={48} outerRadius={74} paddingAngle={2} stroke="none">
                    {wealthComposition.map((slice) => <Cell key={slice.name} fill={slice.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => currencyFormatter.euroWithCents(Number(value))} itemStyle={{color:palette.ink}} labelStyle={{color:palette.sub}} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8,color:palette.ink}} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginTop:8 }}>
                {wealthComposition.map((slice) => (
                  <span key={slice.name} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:palette.sub }}>
                    <span style={{ width:9, height:9, borderRadius:2, background:slice.color }} />
                    {slice.name} <span className="num" style={{ color:palette.ink }}>{currencyFormatter.percent(portfolioDerived.total ? slice.value / portfolioDerived.total * 100 : 0)}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card" style={{ display:"flex", flexDirection:"column" }}>
          <div className="eyebrow" style={{ marginBottom:8 }}>Superávit de los últimos meses</div>
          {surplusHistory.length === 0 ? (
            <div style={{ height:180, display:"flex", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"0 16px", color:palette.faint, fontSize:12.5, lineHeight:1.5 }}>
              {baseBudget == null
                ? "Configura tu presupuesto para ver el superávit de los últimos meses."
                : "Registra algún mes en Presupuesto para ver aquí su evolución."}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={surplusHistory} margin={{ left:0, right:0, top:6, bottom:0 }}>
                  <XAxis dataKey="label" stroke={palette.faint} tick={{ fontSize:11.5 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]} />
                  <Tooltip formatter={(value) => currencyFormatter.euroWithCents(Number(value))} cursor={{ fill: palette.panel2 }} itemStyle={{color:palette.ink}} labelStyle={{color:palette.sub}} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8}} />
                  <Bar dataKey="surplus" radius={[4,4,4,4]} maxBarSize={48}>
                    {surplusHistory.map((point) => <Cell key={point.label} fill={point.surplus >= 0 ? palette.acc : palette.bad} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {hasIncompleteSurplusHistory && (
                <div style={{ marginTop:8, fontSize:11.5, color:palette.faint, textAlign:"center" }}>
                  Necesitas al menos 2 meses registrados para ver la tendencia.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
