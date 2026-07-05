"use client";

import React, { useState, useMemo } from "react";
import { palette } from "@/lib/theme";
import type { Posicion, PuntoHistorico, Deuda, Mes, PresupuestoBase, GastoFijoItem, CondicionesBTC } from "@/domain/types";
import {
  CARTERA_INICIAL, HISTORICO_INICIAL, DEUDAS_INICIAL,
  PRESUPUESTO_BASE_INICIAL, GASTOS_FIJOS_INICIAL, MESES_INICIAL,
} from "@/data/initial-state";
import { carteraCalculator } from "@/domain/CarteraCalculator";
import { AppStyles } from "@/app/AppStyles";
import { PatrimonioTab } from "@/features/patrimonio/PatrimonioTab";
import { PresupuestoTab } from "@/features/presupuesto/PresupuestoTab";
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
  const [cartera, setCartera] = useState<Posicion[]>(CARTERA_INICIAL);
  const [historico] = useState<PuntoHistorico[]>(HISTORICO_INICIAL);
  const [deudas, setDeudas] = useState<Deuda[]>(DEUDAS_INICIAL);
  const [presupuestoBase, setPresupuestoBase] = useState<PresupuestoBase>(PRESUPUESTO_BASE_INICIAL);
  const [meses, setMeses] = useState<Mes[]>(MESES_INICIAL);
  const [gastosFijosItems, setGastosFijosItems] = useState<GastoFijoItem[]>(GASTOS_FIJOS_INICIAL);
  const [salarioActual, setSalarioActual] = useState<number>(27000);
  const [aportacionFI, setAportacionFI] = useState<number>(293);
  const [rentabilidadFI, setRentabilidadFI] = useState<number>(0.07);
  const [huchaBTC, setHuchaBTC] = useState<number>(0);
  const [condicionesBTC, setCondicionesBTC] = useState<CondicionesBTC>({ prescindible: true, dcaActivo: true });
  const [contarCoche, setContarCoche] = useState<boolean>(true);

  const derivada = useMemo(() => carteraCalculator.derivar(cartera), [cartera]);

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
        <PatrimonioTab cartera={cartera} setCartera={setCartera} historico={historico} derivada={derivada} deudas={deudas} />
      )}
      {tab === "presupuesto" && (
        <PresupuestoTab presupuestoBase={presupuestoBase} setPresupuestoBase={setPresupuestoBase} meses={meses} setMeses={setMeses} gastosFijosItems={gastosFijosItems} setGastosFijosItems={setGastosFijosItems} />
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
