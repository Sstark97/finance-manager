"use client";

import React, { useState, useMemo } from "react";
import { palette } from "@/lib/theme";
import type { CondicionesBTC } from "@/domain/types";
import type { Debt } from "@/shared/domain/types";
import { DEBTS_INITIAL } from "@/shared/data/debts";
import type { Position, PortfolioHistoryPoint } from "@/features/wealth/domain/types";
import { PORTFOLIO_INITIAL, PRICE_HISTORY_INITIAL } from "@/features/wealth/data/portfolio";
import { portfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Month, Budget, FixedExpenseItem } from "@/features/budget/domain/types";
import { BUDGET_BASE_INITIAL, FIXED_EXPENSES_INITIAL, MONTHS_INITIAL } from "@/features/budget/data/budget";
import { AppStyles } from "@/app/AppStyles";
import { WealthTab } from "@/features/wealth/components/WealthTab";
import { BudgetTab } from "@/features/budget/components/BudgetTab";
import { MetasTab } from "@/features/metas/MetasTab";

/* ============================================================================
   FINANZAS — Aitor Santana
   --------------------------------------------------------------------------
   App de 3 pestañas:
     1. Patrimonio   — cartera de inversión (fondos/ETF/cripto/efectivo) + deudas
     2. Presupuesto  — presupuesto anual, desglose mensual editable, real vs plan
     3. Metas        — libertad financiera, vivienda, fases del plan, op. Bitcoin
   Todo en memoria (useState). El Excel de Drive sigue siendo la fuente de verdad;
   esto es el panel de control visual para tomar decisiones rápido.
   ============================================================================ */

type TabId = "patrimonio" | "presupuesto" | "metas";

/* ============================================================================
   APP RAÍZ — navegación por pestañas
   ============================================================================ */
export default function FinanzasApp(): React.JSX.Element {
  const [tab, setTab] = useState<TabId>("patrimonio");
  const [cartera, setCartera] = useState<Position[]>(PORTFOLIO_INITIAL);
  const [historico] = useState<PortfolioHistoryPoint[]>(PRICE_HISTORY_INITIAL);
  const [deudas, setDeudas] = useState<Debt[]>(DEBTS_INITIAL);
  const [presupuestoBase, setPresupuestoBase] = useState<Budget>(BUDGET_BASE_INITIAL);
  const [meses, setMeses] = useState<Month[]>(MONTHS_INITIAL);
  const [gastosFijosItems, setGastosFijosItems] = useState<FixedExpenseItem[]>(FIXED_EXPENSES_INITIAL);
  const [salarioActual, setSalarioActual] = useState<number>(27000);
  const [aportacionFI, setAportacionFI] = useState<number>(293);
  const [rentabilidadFI, setRentabilidadFI] = useState<number>(0.07);
  const [huchaBTC, setHuchaBTC] = useState<number>(0);
  const [condicionesBTC, setCondicionesBTC] = useState<CondicionesBTC>({ prescindible: true, dcaActivo: true });
  const [contarCoche, setContarCoche] = useState<boolean>(true);

  const derivada = useMemo(() => portfolioCalculator.derive(cartera), [cartera]);

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: "patrimonio",  label: "Patrimonio" },
    { id: "presupuesto", label: "Presupuesto" },
    { id: "metas",       label: "Metas" },
  ];

  return (
    <div style={{ background:palette.bg, minHeight:"100vh", color:palette.ink, fontFamily:"'DM Sans',system-ui,sans-serif", padding:"clamp(16px,4vw,40px)" }}>
      <AppStyles />

      <header style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:16, marginBottom:20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom:8 }}>Finanzas · {new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</div>
          <h1 className="disp" style={{ margin:0, fontSize:"clamp(24px,4.5vw,36px)", fontWeight:600, letterSpacing:"-.02em" }}>
            {tab === "patrimonio" ? "Patrimonio total" : tab === "presupuesto" ? "Presupuesto" : "Metas y plan"}
          </h1>
        </div>
        <nav className="tabnav">
          {TABS.map(t => (
            <button key={t.id} className={`tabbtn ${tab===t.id?"on":""}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
      </header>

      {tab === "patrimonio" && (
        <WealthTab portfolio={cartera} setPortfolio={setCartera} priceHistory={historico} portfolioDerived={derivada} debts={deudas} />
      )}
      {tab === "presupuesto" && (
        <BudgetTab baseBudget={presupuestoBase} setBaseBudget={setPresupuestoBase} months={meses} setMonths={setMeses} fixedExpenseItems={gastosFijosItems} setFixedExpenseItems={setGastosFijosItems} />
      )}
      {tab === "metas" && (
        <MetasTab
          derivada={derivada} deudas={deudas} setDeudas={setDeudas}
          salarioActual={salarioActual} setSalarioActual={setSalarioActual}
          aportacionFI={aportacionFI} setAportacionFI={setAportacionFI}
          rentabilidadFI={rentabilidadFI} setRentabilidadFI={setRentabilidadFI}
          huchaBTC={huchaBTC} setHuchaBTC={setHuchaBTC}
          condicionesBTC={condicionesBTC} setCondicionesBTC={setCondicionesBTC}
          contarCoche={contarCoche} setContarCoche={setContarCoche}
        />
      )}

      <footer style={{ marginTop:24, paddingTop:16, borderTop:`1px solid ${palette.line}`, fontSize:11.5, color:palette.faint, lineHeight:1.6 }}>
        Cartera editable · el precio lo trae Yahoo por ticker desde tu backend (fetchYahooPrice). Composición de índices orientativa.
        No es aseso
        ramiento financiero regulado. Tu Excel de Drive sigue siendo la fuente de verdad.
      </footer>
    </div>
  );
}
