"use client";

import React, { useState, useMemo } from "react";
import { palette } from "@/lib/theme";
import type { Debt } from "@/shared/domain/types";
import { DEBTS_INITIAL } from "@/shared/data/debts";
import type { Position, PortfolioHistoryPoint } from "@/features/wealth/domain/types";
import { PORTFOLIO_INITIAL, PRICE_HISTORY_INITIAL } from "@/features/wealth/data/portfolio";
import { portfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Month, Budget, FixedExpenseItem } from "@/features/budget/domain/types";
import { BUDGET_BASE_INITIAL, FIXED_EXPENSES_INITIAL, MONTHS_INITIAL } from "@/features/budget/data/budget";
import type { BtcConditions } from "@/features/goals/domain/types";
import { AppStyles } from "@/app/AppStyles";
import { WealthTab } from "@/features/wealth/components/WealthTab";
import { BudgetTab } from "@/features/budget/components/BudgetTab";
import { GoalsTab } from "@/features/goals/components/GoalsTab";

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

type TabId = "wealth" | "budget" | "goals";

/* ============================================================================
   APP RAÍZ — navegación por pestañas
   ============================================================================ */
export default function FinanceApp(): React.JSX.Element {
  const [tab, setTab] = useState<TabId>("wealth");
  const [portfolio, setPortfolio] = useState<Position[]>(PORTFOLIO_INITIAL);
  const [priceHistory] = useState<PortfolioHistoryPoint[]>(PRICE_HISTORY_INITIAL);
  const [debts, setDebts] = useState<Debt[]>(DEBTS_INITIAL);
  const [baseBudget, setBaseBudget] = useState<Budget>(BUDGET_BASE_INITIAL);
  const [months, setMonths] = useState<Month[]>(MONTHS_INITIAL);
  const [fixedExpenseItems, setFixedExpenseItems] = useState<FixedExpenseItem[]>(FIXED_EXPENSES_INITIAL);
  const [currentSalary, setCurrentSalary] = useState<number>(27000);
  const [fiContribution, setFiContribution] = useState<number>(293);
  const [fiReturn, setFiReturn] = useState<number>(0.07);
  const [btcSavings, setBtcSavings] = useState<number>(0);
  const [btcConditions, setBtcConditions] = useState<BtcConditions>({ disposable: true, dcaActive: true });
  const [countCar, setCountCar] = useState<boolean>(true);

  const portfolioDerived = useMemo(() => portfolioCalculator.derive(portfolio), [portfolio]);

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: "wealth",  label: "Patrimonio" },
    { id: "budget", label: "Presupuesto" },
    { id: "goals",       label: "Metas" },
  ];

  return (
    <div style={{ background:palette.bg, minHeight:"100vh", color:palette.ink, fontFamily:"'DM Sans',system-ui,sans-serif", padding:"clamp(16px,4vw,40px)" }}>
      <AppStyles />

      <header style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:16, marginBottom:20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom:8 }}>Finanzas · {new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</div>
          <h1 className="disp" style={{ margin:0, fontSize:"clamp(24px,4.5vw,36px)", fontWeight:600, letterSpacing:"-.02em" }}>
            {tab === "wealth" ? "Patrimonio total" : tab === "budget" ? "Presupuesto" : "Metas y plan"}
          </h1>
        </div>
        <nav className="tabnav">
          {TABS.map(tabItem => (
            <button key={tabItem.id} className={`tabbtn ${tab===tabItem.id?"on":""}`} onClick={() => setTab(tabItem.id)}>{tabItem.label}</button>
          ))}
        </nav>
      </header>

      {tab === "wealth" && (
        <WealthTab portfolio={portfolio} setPortfolio={setPortfolio} priceHistory={priceHistory} portfolioDerived={portfolioDerived} debts={debts} />
      )}
      {tab === "budget" && (
        <BudgetTab baseBudget={baseBudget} setBaseBudget={setBaseBudget} months={months} setMonths={setMonths} fixedExpenseItems={fixedExpenseItems} setFixedExpenseItems={setFixedExpenseItems} />
      )}
      {tab === "goals" && (
        <GoalsTab
          portfolioDerived={portfolioDerived} debts={debts} setDebts={setDebts}
          currentSalary={currentSalary} setCurrentSalary={setCurrentSalary}
          fiContribution={fiContribution} setFiContribution={setFiContribution}
          fiReturn={fiReturn} setFiReturn={setFiReturn}
          btcSavings={btcSavings} setBtcSavings={setBtcSavings}
          btcConditions={btcConditions} setBtcConditions={setBtcConditions}
          countCar={countCar} setCountCar={setCountCar}
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
