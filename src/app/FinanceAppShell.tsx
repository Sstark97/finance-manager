"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { palette } from "@/lib/theme";
import type { Debt } from "@/shared/domain/types";
import type { Position } from "@/features/wealth/domain/types";
import { portfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";
import type { Month, Budget, FixedExpenseItem } from "@/features/budget/domain/types";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import { AppStyles } from "@/app/AppStyles";
import { MobileTabBar, WealthIcon, BudgetIcon, GoalsIcon, DebtsIcon } from "@/app/MobileTabBar";
import { WealthTab } from "@/features/wealth/components/WealthTab";
import { BudgetTab } from "@/features/budget/components/BudgetTab";
import { GoalsTab } from "@/features/goals/components/GoalsTab";
import { DebtsSection } from "@/features/debts/components/DebtsSection";
import { financeDataExporter } from "@/shared/domain/FinanceDataExporter";
import { browserFileDownloader } from "@/shared/infrastructure/BrowserFileDownloader";
import { savePortfolio } from "@/app/actions/savePortfolio";
import { saveDebts } from "@/app/actions/saveDebts";
import { saveBudget } from "@/app/actions/saveBudget";
import { saveGoalsSettings } from "@/app/actions/saveGoalsSettings";
import { saveWealthTargets } from "@/app/actions/saveWealthTargets";
import { signOutAction } from "@/app/actions/authSession";

const PERSIST_DEBOUNCE_MS = 800;

type TabId = "wealth" | "budget" | "debts" | "goals";

const TAB_TITLE: Record<TabId, string> = {
  wealth: "Patrimonio total",
  budget: "Presupuesto",
  debts: "Deudas",
  goals: "Metas y plan",
};

export interface FinanceAppShellProps {
  currentUserEmail: string;
  initialPortfolio: Position[];
  initialDebts: Debt[];
  initialBaseBudget: Budget | null;
  initialFixedExpenseItems: FixedExpenseItem[];
  initialMonths: Month[];
  initialGoalsSettings: GoalsSettings | null;
  initialWealthTargets: WealthTargets | null;
}

export function FinanceAppShell({
  currentUserEmail, initialPortfolio, initialDebts, initialBaseBudget, initialFixedExpenseItems, initialMonths,
  initialGoalsSettings, initialWealthTargets,
}: FinanceAppShellProps): React.JSX.Element {
  const [tab, setTab] = useState<TabId>("wealth");
  const [portfolio, setPortfolio] = useState<Position[]>(initialPortfolio);
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [baseBudget, setBaseBudget] = useState<Budget | null>(initialBaseBudget);
  const [months, setMonths] = useState<Month[]>(initialMonths);
  const [fixedExpenseItems, setFixedExpenseItems] = useState<FixedExpenseItem[]>(initialFixedExpenseItems);
  const [goalsSettings, setGoalsSettings] = useState<GoalsSettings | null>(initialGoalsSettings);
  const [wealthTargets, setWealthTargets] = useState<WealthTargets | null>(initialWealthTargets);

  const portfolioDerived = useMemo(() => portfolioCalculator.derive(portfolio), [portfolio]);

  const pendingPortfolioFlush = useRef<(() => void) | null>(null);
  const pendingDebtsFlush = useRef<(() => void) | null>(null);
  const pendingBudgetFlush = useRef<(() => void) | null>(null);
  const pendingGoalsSettingsFlush = useRef<(() => void) | null>(null);
  const pendingWealthTargetsFlush = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      pendingPortfolioFlush.current?.();
      pendingDebtsFlush.current?.();
      pendingBudgetFlush.current?.();
      pendingGoalsSettingsFlush.current?.();
      pendingWealthTargetsFlush.current?.();
    };
  }, []);

  const isFirstPortfolioRun = useRef(true);
  useEffect(() => {
    if (isFirstPortfolioRun.current) { isFirstPortfolioRun.current = false; return; }
    const persistPortfolio = (): void => {
      pendingPortfolioFlush.current = null;
      savePortfolio(portfolio).catch((error: unknown) => console.error("Failed to persist portfolio", error));
    };
    pendingPortfolioFlush.current = persistPortfolio;
    const timeoutId = setTimeout(persistPortfolio, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [portfolio]);

  const isFirstDebtsRun = useRef(true);
  useEffect(() => {
    if (isFirstDebtsRun.current) { isFirstDebtsRun.current = false; return; }
    const persistDebts = (): void => {
      pendingDebtsFlush.current = null;
      saveDebts(debts).catch((error: unknown) => console.error("Failed to persist debts", error));
    };
    pendingDebtsFlush.current = persistDebts;
    const timeoutId = setTimeout(persistDebts, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [debts]);

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

  const isFirstGoalsSettingsRun = useRef(true);
  useEffect(() => {
    if (isFirstGoalsSettingsRun.current) { isFirstGoalsSettingsRun.current = false; return; }
    if (goalsSettings == null) return;
    const persistGoalsSettings = (): void => {
      pendingGoalsSettingsFlush.current = null;
      saveGoalsSettings(goalsSettings).catch((error: unknown) => console.error("Failed to persist goals settings", error));
    };
    pendingGoalsSettingsFlush.current = persistGoalsSettings;
    const timeoutId = setTimeout(persistGoalsSettings, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [goalsSettings]);

  const isFirstWealthTargetsRun = useRef(true);
  useEffect(() => {
    if (isFirstWealthTargetsRun.current) { isFirstWealthTargetsRun.current = false; return; }
    if (wealthTargets == null) return;
    const persistWealthTargets = (): void => {
      pendingWealthTargetsFlush.current = null;
      saveWealthTargets(wealthTargets).catch((error: unknown) => console.error("Failed to persist wealth targets", error));
    };
    pendingWealthTargetsFlush.current = persistWealthTargets;
    const timeoutId = setTimeout(persistWealthTargets, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [wealthTargets]);

  const exportAsJson = (): void => {
    const content = financeDataExporter.toJson({ portfolio, debts, baseBudget, fixedExpenseItems, months });
    browserFileDownloader.download("finanzas.json", content, "application/json");
  };
  const exportAsCsv = (): void => {
    const content = financeDataExporter.toCsv({ portfolio, debts, baseBudget, fixedExpenseItems, months });
    browserFileDownloader.download("finanzas.csv", content, "text/csv");
  };

  const TABS: Array<{ id: TabId; label: string; icon: (color: string) => React.ReactNode }> = [
    { id: "wealth",  label: "Patrimonio", icon: WealthIcon },
    { id: "budget", label: "Presupuesto", icon: BudgetIcon },
    { id: "debts",       label: "Deudas", icon: DebtsIcon },
    { id: "goals",       label: "Metas", icon: GoalsIcon },
  ];

  return (
    <div className="shell-with-mobile-tabbar" style={{ background:palette.bg, minHeight:"100vh", color:palette.ink, fontFamily:"'DM Sans',system-ui,sans-serif", padding:"clamp(16px,4vw,40px)" }}>
      <AppStyles />

      <header style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:16, marginBottom:20 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom:8 }}>Finanzas · {new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</div>
          <h1 id="finance-app-heading" className="disp" style={{ margin:0, fontSize:"clamp(24px,4.5vw,36px)", fontWeight:600, letterSpacing:"-.02em" }}>
            {TAB_TITLE[tab]}
          </h1>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <nav className="tabnav desktop-tabnav" role="tablist" aria-label="Secciones">
            {TABS.map(tabItem => (
              <button
                key={tabItem.id}
                id={`tab-${tabItem.id}`}
                role="tab"
                aria-selected={tab===tabItem.id}
                aria-controls="finance-tabpanel"
                className={`tabbtn ${tab===tabItem.id?"on":""}`}
                onClick={() => setTab(tabItem.id)}
              >
                {tabItem.label}
              </button>
            ))}
          </nav>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <button className="seg" onClick={exportAsJson} style={{ border:`1px solid ${palette.line}` }}>Exportar JSON</button>
            <button className="seg" onClick={exportAsCsv} style={{ border:`1px solid ${palette.line}` }}>Exportar CSV</button>
            <span style={{ fontSize:12.5, color:palette.sub }}>{currentUserEmail}</span>
            <form action={signOutAction}>
              <button type="submit" className="tabbtn" style={{ border:`1px solid ${palette.line}` }}>Cerrar sesión</button>
            </form>
          </div>
        </div>
      </header>

      <main aria-labelledby="finance-app-heading">
        <div role="tabpanel" id="finance-tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={-1}>
          {tab === "wealth" && (
            <WealthTab
              portfolio={portfolio} setPortfolio={setPortfolio} portfolioDerived={portfolioDerived} debts={debts}
              wealthTargets={wealthTargets} setWealthTargets={setWealthTargets}
            />
          )}
          {tab === "budget" && (
            <BudgetTab baseBudget={baseBudget} setBaseBudget={setBaseBudget} months={months} setMonths={setMonths} fixedExpenseItems={fixedExpenseItems} setFixedExpenseItems={setFixedExpenseItems} />
          )}
          {tab === "debts" && (
            <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>
              <DebtsSection debts={debts} setDebts={setDebts} portfolioTotal={portfolioDerived.total} />
            </div>
          )}
          {tab === "goals" && (
            <GoalsTab
              portfolioDerived={portfolioDerived}
              settings={goalsSettings} setSettings={setGoalsSettings}
              wealthTargets={wealthTargets}
            />
          )}
        </div>
      </main>

      <footer style={{ marginTop:24, paddingTop:16, borderTop:`1px solid ${palette.line}`, fontSize:11.5, color:palette.faint, lineHeight:1.6 }}>
        Cartera editable · el precio lo trae Yahoo por ticker vía el backend (POST /api/prices). Composición de índices orientativa.
        No es asesoramiento financiero regulado. Los cambios se guardan automáticamente.
      </footer>

      <MobileTabBar items={TABS} activeTabId={tab} onSelect={setTab} />
    </div>
  );
}
