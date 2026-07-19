"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { palette } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import type { SurplusHistoryPoint } from "@/features/dashboard/domain/SurplusHistoryCalculator";

export interface SurplusHistoryChartProps {
  surplusHistory: SurplusHistoryPoint[];
}

export function SurplusHistoryChart({ surplusHistory }: SurplusHistoryChartProps): React.JSX.Element {
  const hasIncompleteSurplusHistory = surplusHistory.length > 0 && surplusHistory.length < 2;

  return (
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
  );
}
