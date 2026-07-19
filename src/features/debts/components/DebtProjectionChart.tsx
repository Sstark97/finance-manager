"use client";

import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { palette } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import type { Debt } from "@/shared/domain/types";
import {
  debtAmortizationProjector,
  DEFAULT_PROJECTION_HORIZON_MONTHS,
  type DebtAmortizationPoint,
} from "@/shared/domain/DebtAmortizationProjector";
export interface DebtProjectionChartProps {
  debts: Debt[];
}

const PROJECTION_LINE_COLOR = palette.acc;
const PROJECTION_HORIZON_YEARS = Math.round(DEFAULT_PROJECTION_HORIZON_MONTHS / 12);

interface DebtProjectionDatum {
  label: string;
  totalRemaining: number;
}

function shortMonthYearLabelOf(point: DebtAmortizationPoint): string {
  return point.date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).replace(".", "");
}

function fullMonthYearLabelOf(point: DebtAmortizationPoint): string {
  return point.date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function yearsAndMonthsLabel(monthsCount: number): string {
  const years = Math.floor(monthsCount / 12);
  const months = monthsCount % 12;
  const yearsPart = years > 0 ? `${years} año${years === 1 ? "" : "s"}` : "";
  const monthsPart = months > 0 ? `${months} mes${months === 1 ? "" : "es"}` : "";
  if (yearsPart && monthsPart) return `${yearsPart} y ${monthsPart}`;
  return yearsPart || monthsPart || "0 meses";
}

function toChartData(points: DebtAmortizationPoint[]): DebtProjectionDatum[] {
  return points.map((point) => ({ label: shortMonthYearLabelOf(point), totalRemaining: point.totalRemaining }));
}

export function DebtProjectionChart({ debts }: DebtProjectionChartProps): React.JSX.Element {
  const projection = debtAmortizationProjector.project(debts, new Date());

  if (projection.points.length === 0) {
    return (
      <div>
        <div className="eyebrow">Proyección · amortización de deuda</div>
        <div style={{ fontSize: 12.5, color: palette.faint, marginTop: 10 }}>Sin deudas activas que proyectar.</div>
      </div>
    );
  }

  const chartData = toChartData(projection.points);
  const monthsUntilDebtFree = projection.debtFreeMonth;
  const debtFreePoint = monthsUntilDebtFree !== null ? projection.points[projection.points.length - 1] : null;

  return (
    <div>
      <div className="eyebrow">Proyección · amortización de deuda</div>
      <div style={{ fontSize: 11.5, color: palette.faint, marginTop: 4, marginBottom: 12 }}>
        Estimación teórica suponiendo que cada deuda se paga con su cuota mensual actual, sin intereses ni cambios.
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
          <XAxis dataKey="label" hide />
          <YAxis hide domain={[0, "dataMax"]} />
          <Tooltip
            formatter={(value) => currencyFormatter.euro(Number(value))}
            cursor={{ stroke: palette.faint, strokeWidth: 1 }}
            itemStyle={{ color: palette.ink }}
            contentStyle={{ background: palette.panel2, border: `1px solid ${palette.line}`, borderRadius: 8 }}
            labelStyle={{ color: palette.sub }}
          />
          <Line
            type="monotone"
            dataKey="totalRemaining"
            stroke={PROJECTION_LINE_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive
            animationDuration={500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="num" style={{ marginTop: 10, fontSize: 13.5, textAlign: "center" }}>
        {monthsUntilDebtFree === null && (
          <span style={{ color: palette.warn }}>
            Al ritmo actual de pago, no te librarás de la deuda en los próximos {PROJECTION_HORIZON_YEARS} años.
          </span>
        )}
        {monthsUntilDebtFree === 0 && (
          <span style={{ color: palette.acc }}>Ya estás libre de deudas según el saldo registrado.</span>
        )}
        {monthsUntilDebtFree !== null && monthsUntilDebtFree > 0 && debtFreePoint && (
          <span style={{ color: palette.acc }}>
            Libre de deudas en ~{yearsAndMonthsLabel(monthsUntilDebtFree)} ({fullMonthYearLabelOf(debtFreePoint)})
          </span>
        )}
      </div>
    </div>
  );
}
