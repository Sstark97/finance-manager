"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";
import { palette } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import type { Position, PortfolioHistoryPoint } from "@/features/wealth/domain/types";
import type { HistoryRange } from "@/features/wealth/domain/HistoryRange";
import type { PortfolioHistoryResult } from "@/features/wealth/application/ComputePortfolioHistory";

export interface WealthEvolutionSummary {
  change: number;
  changePercent: number;
}

export interface WealthEvolutionChartProps {
  portfolio: Position[];
  total: number;
  liquidityTotal: number;
  onSummaryChange?: (summary: WealthEvolutionSummary) => void;
}

const HISTORY_RANGE_OPTIONS: Array<[HistoryRange, string]> = [
  ["1d", "Día"], ["1w", "Semana"], ["1m", "Mes"], ["ytd", "YTD"], ["1y", "Año"],
];

export function WealthEvolutionChart({ portfolio, total, liquidityTotal, onSummaryChange }: WealthEvolutionChartProps): React.JSX.Element {
  const [history, setHistory] = useState<PortfolioHistoryPoint[]>([]);
  const [historyRange, setHistoryRange] = useState<HistoryRange>("ytd");
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyWarning, setHistoryWarning] = useState<string | null>(null);

  const firstHistoryTotal = history[0]?.total ?? total;
  const firstInvestedTotal = firstHistoryTotal - liquidityTotal;
  const change = total - firstHistoryTotal;
  const changePercent = firstInvestedTotal ? (change / firstInvestedTotal) * 100 : 0;

  useEffect(() => {
    onSummaryChange?.({ change, changePercent });
  }, [change, changePercent, onSummaryChange]);

  const portfolioRef = useRef(portfolio);
  useEffect(() => { portfolioRef.current = portfolio; }, [portfolio]);

  const loadHistory = useCallback(async (range: HistoryRange): Promise<void> => {
    setLoadingHistory(true);
    setHistoryWarning(null);
    try {
      const response = await fetch("/api/prices/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: portfolioRef.current, range }),
      });
      if (!response.ok) throw new Error("El backend de histórico no respondió correctamente");
      const result = (await response.json()) as PortfolioHistoryResult;
      setHistory(result.points);
      setHistoryWarning(result.failedTickers.length > 0
        ? `No se pudo reconstruir el histórico de: ${result.failedTickers.join(", ")}.`
        : null);
    } catch {
      setHistoryWarning("No se pudo conectar con el backend de histórico. Se mantiene la última serie cargada.");
    } finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => {
    const historyFetchId = setTimeout(() => { loadHistory(historyRange); }, 0);
    return () => clearTimeout(historyFetchId);
  }, [historyRange, loadHistory]);

  return (
    <div className="card span-full widget-wealth-evolution">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:16 }}>
        <div className="eyebrow">Evolución del patrimonio</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {HISTORY_RANGE_OPTIONS.map(([key,label]) => (
            <button key={key} className={`seg ${historyRange===key?"on":""}`} onClick={() => setHistoryRange(key)}>{label}</button>
          ))}
        </div>
      </div>
      {historyWarning && (
        <div style={{ marginBottom:12, fontSize:12.5, color:palette.warn }}>{historyWarning}</div>
      )}
      {loadingHistory && history.length === 0 ? (
        <div style={{ height:260, display:"flex", alignItems:"center", justifyContent:"center", color:palette.faint, fontSize:13 }}>
          Cargando histórico…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart key={historyRange} data={history} margin={{ left:0, right:0, top:6, bottom:0 }}>
            <XAxis dataKey="label" hide />
            <YAxis domain={["dataMin","dataMax"]} hide />
            <ReferenceLine y={firstHistoryTotal} stroke={palette.faint} strokeDasharray="3 4" />
            <Tooltip formatter={(value)=>currencyFormatter.euroWithCents(Number(value))} cursor={{ stroke: palette.faint, strokeWidth: 1 }} itemStyle={{color:palette.ink}} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8}} labelStyle={{color:palette.sub}} />
            <Line type="monotone" dataKey="total" stroke={change>=0?palette.acc:palette.bad} strokeWidth={2} dot={false} activeDot={{ r:4 }} isAnimationActive animationDuration={500} animationEasing="ease-out" />
          </LineChart>
        </ResponsiveContainer>
      )}
      <div className="num" style={{ marginTop:10, fontSize:13.5, textAlign:"center" }}>
        <span style={{ color: change>=0 ? palette.acc : palette.bad }}>{change>=0?"▲":"▼"} {currencyFormatter.euroWithCents(Math.abs(change))} ({changePercent>=0?"+":""}{changePercent.toFixed(2)}%)</span>
        <span style={{ color:palette.faint }}> en el rango seleccionado</span>
      </div>
    </div>
  );
}
