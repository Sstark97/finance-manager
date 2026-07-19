"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { palette } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";

export interface WealthCompositionSlice {
  name: string;
  value: number;
  color: string;
}

export interface WealthCompositionChartProps {
  wealthComposition: WealthCompositionSlice[];
  total: number;
}

export function WealthCompositionChart({ wealthComposition, total }: WealthCompositionChartProps): React.JSX.Element {
  return (
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
            {slice.name} <span className="num" style={{ color:palette.ink }}>{currencyFormatter.percent(total ? slice.value / total * 100 : 0)}</span>
          </span>
        ))}
      </div>
    </>
  );
}
