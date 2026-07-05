"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { palette, seriesColorAt } from "@/lib/theme";
import { formatEuro, formatEuroWithCents, formatPercent, generateId } from "@/lib/format";
import type {
  TipoPosicion, Posicion, PuntoHistorico, Deuda,
  CategoriaId, GastoFijoItem, CategoriaEvento, Mes,
  PresupuestoBase, PresupuestoBaseBorrador, Fase, CondicionesBTC, CompItem,
} from "@/domain/types";
import { esMesDisponible } from "@/domain/presupuesto/mes";
import {
  CARTERA_INICIAL, HISTORICO_INICIAL, DEUDAS_INICIAL,
  PRESUPUESTO_BASE_INICIAL, GASTOS_FIJOS_INICIAL, MESES_INICIAL,
} from "@/data/initial-state";
import {
  OBJETIVOS, COMPOSICION, OBJETIVO_FI, OBJETIVO_VIVIENDA, OBJETIVO_BTC_OP,
  FASES, CATEGORIAS, CATEGORIA_LABEL,
} from "@/domain/config";
import { carteraCalculator } from "@/domain/CarteraCalculator";
import type { CarteraDerivada } from "@/domain/CarteraCalculator";
import { presupuestoMensualCalculator } from "@/domain/PresupuestoMensualCalculator";
import type { CalculoMes } from "@/domain/PresupuestoMensualCalculator";
import { proyeccionFinancieraCalculator } from "@/domain/ProyeccionFinancieraCalculator";
import { fetchYahooPrice } from "@/infrastructure/precios";
import { Metric } from "@/components/Metric";
import { AppStyles } from "@/app/AppStyles";

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

interface Alerta {
  t: "good" | "warn" | "bad";
  m: string;
}

type TabId = "patrimonio" | "presupuesto" | "metas";
type VistaComposicion = "paises" | "sectores";

interface PatrimonioTabProps {
  cartera: Posicion[];
  setCartera: React.Dispatch<React.SetStateAction<Posicion[]>>;
  historico: PuntoHistorico[];
  derivada: CarteraDerivada;
  deudas: Deuda[];
}

interface PresupuestoTabProps {
  presupuestoBase: PresupuestoBase;
  setPresupuestoBase: React.Dispatch<React.SetStateAction<PresupuestoBase>>;
  meses: Mes[];
  setMeses: React.Dispatch<React.SetStateAction<Mes[]>>;
  gastosFijosItems: GastoFijoItem[];
  setGastosFijosItems: React.Dispatch<React.SetStateAction<GastoFijoItem[]>>;
}

interface MetasTabProps {
  derivada: CarteraDerivada;
  deudas: Deuda[];
  setDeudas: React.Dispatch<React.SetStateAction<Deuda[]>>;
  salarioActual: number;
  setSalarioActual: React.Dispatch<React.SetStateAction<number>>;
  aportacionFI: number;
  setAportacionFI: React.Dispatch<React.SetStateAction<number>>;
  rentabilidadFI: number;
  setRentabilidadFI: React.Dispatch<React.SetStateAction<number>>;
  huchaBTC: number;
  setHuchaBTC: React.Dispatch<React.SetStateAction<number>>;
  condicionesBTC: CondicionesBTC;
  setCondicionesBTC: React.Dispatch<React.SetStateAction<CondicionesBTC>>;
  contarCoche: boolean;
  setContarCoche: React.Dispatch<React.SetStateAction<boolean>>;
}

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

/* ============================================================================
   PESTAÑA 1 — PATRIMONIO
   ============================================================================ */
type CampoPosicionEditable = "nombre" | "tipo" | "ticker" | "participaciones" | "precio";

function PatrimonioTab({ cartera, setCartera, historico, derivada, deudas }: PatrimonioTabProps): React.JSX.Element {
  const [estanflacion, setEstanflacion] = useState<boolean>(true);
  const [editando, setEditando] = useState<boolean>(false);
  const [drilldown, setDrilldown] = useState<string>("world");
  const [vista, setVista] = useState<VistaComposicion>("paises");
  const [cargandoPrecios, setCargandoPrecios] = useState<boolean>(false);

  const { total, invertido, liquidezTotal, rv, btcTotal, btcPesoTotal, pesoRVde, pieCartera } = derivada;

  const ultimoHist = historico[historico.length - 1]?.total ?? total;
  const variacion = total - ultimoHist;
  const variacionPct = ultimoHist ? (variacion / ultimoHist) * 100 : 0;

  const deudaTotal = deudas.reduce((s,d)=>s+(d.saldo||0),0);
  const patrimonioNeto = total - deudaTotal;

  const diasApplewatch = useMemo((): number | null => {
    const d = deudas.find(x => x.id === "applewatch");
    if (!d || d.saldo <= 0 || !d.limite) return null;
    const dias = Math.ceil((new Date(d.limite).getTime() - new Date().getTime()) / 86400000);
    return dias;
  }, [deudas]);

  const alertas = useMemo((): Alerta[] => {
    const a: Alerta[] = [];
    if (diasApplewatch != null && diasApplewatch >= 0)
      a.push({ t: diasApplewatch <= 3 ? "bad" : "warn", m: `Liquidar Apple Watch: quedan ${diasApplewatch} día${diasApplewatch===1?"":"s"} (antes del 10 de julio).` });
    if (liquidezTotal < OBJETIVOS.fondoMinimo)
      a.push({ t:"warn", m:`Fondo de emergencia por debajo del mínimo de ${formatEuro(OBJETIVOS.fondoMinimo)}. Es la prioridad.` });
    if (btcPesoTotal > OBJETIVOS.btcVender && total > OBJETIVOS.btcUmbralVender)
      a.push({ t:"bad", m:`BTC supera el 50% con cartera >20k: toca venta parcial hasta el 30%.` });
    else if (btcPesoTotal > OBJETIVOS.btcPausar && total > OBJETIVOS.btcUmbralPausar)
      a.push({ t:"warn", m:`BTC supera el 40% con cartera >10k: pausar aportaciones de BTC.` });
    const desvW = Math.abs(pesoRVde("world") - OBJETIVOS.pesoRV.world);
    if (rv && desvW > 8) a.push({ t:"warn", m:`World desviado ${desvW.toFixed(0)} pts del objetivo 60%. El DCA lo corrige.` });
    if (liquidezTotal >= OBJETIVOS.fondoEmergencia)
      a.push({ t:"good", m:`Fondo de emergencia completo (${formatEuro(OBJETIVOS.fondoEmergencia)}). Replantea virar a inversión.` });
    if (a.length === 0) a.push({ t:"good", m:"Todo dentro de plan. Sigue con el DCA." });
    return a;
  }, [liquidezTotal, btcPesoTotal, total, rv, diasApplewatch, pesoRVde]);

  const score = useMemo((): { total: number; detalle: Array<[string, number]> } => {
    let s = 0; const detalle: Array<[string, number]> = [];
    s += 10*0.15; detalle.push(["Estructura y fiscalidad", 10]);
    s += 10*0.10; detalle.push(["Costes (TER bajos)", 10]);
    const desv = (Math.abs(pesoRVde("world")-60)+Math.abs(pesoRVde("em")-20)+Math.abs(pesoRVde("nasdaq")-20))/3;
    const diversificacion = rv ? Math.max(4, 10 - desv/2) : 6;
    s += diversificacion*0.20; detalle.push(["Diversificación RV", diversificacion]);
    const ratioFondo = Math.min(1, liquidezTotal / OBJETIVOS.fondoEmergencia);
    const colchon = 2 + ratioFondo*8; s += colchon*0.30; detalle.push(["Colchón de emergencia", colchon]);
    const btcSano = btcPesoTotal <= 20 ? 10 : Math.max(3, 10-(btcPesoTotal-20)/3);
    s += btcSano*0.10; detalle.push(["Riesgo Bitcoin", btcSano]);
    const tamano = Math.min(10, 3 + total/8000); s += tamano*0.15; detalle.push(["Tamaño de cartera", tamano]);
    return { total: s, detalle };
  }, [rv, liquidezTotal, btcPesoTotal, total, pesoRVde]);

  const compKeys = Object.keys(COMPOSICION).filter(k => cartera.some(p => p.id === k));
  const drillActivo = compKeys.includes(drilldown) ? drilldown : compKeys[0];
  const comp = COMPOSICION[drillActivo];
  const compData: CompItem[] = comp ? (vista === "paises" ? comp.paises : comp.sectores) : [];

  const editar = (id: string, campo: CampoPosicionEditable, valor: string): void => setCartera(cs => cs.map(p => p.id === id
    ? { ...p, [campo]: (campo === "participaciones" || campo === "precio") ? (parseFloat(valor) || 0) : valor } as Posicion
    : p));
  const borrar = (id: string): void => setCartera(cs => cs.filter(p => p.id !== id));
  const anadir = (tipo: TipoPosicion): void => setCartera(cs => [...cs, {
    id: generateId(), nombre: tipo === "efectivo" ? "Nuevo efectivo" : "Nueva posición",
    ticker: "", tipo, participaciones: 0, precio: tipo === "efectivo" ? 1 : 0,
    grupo: tipo === "cripto" ? "btc" : tipo === "efectivo" ? "liquidez" : "rv",
  }]);

  const actualizarPrecios = async (): Promise<void> => {
    setCargandoPrecios(true);
    try {
      const updates = await Promise.all(cartera.map(async (p): Promise<{ id: string; precio: number } | null> => {
        if (p.tipo === "efectivo" || !p.ticker) return null;
        try { return { id: p.id, precio: await fetchYahooPrice(p.ticker) }; } catch { return null; }
      }));
      const preciosActualizados = updates.filter((update): update is { id: string; precio: number } => update !== null);
      const map: Record<string, number> = Object.fromEntries(preciosActualizados.map(u => [u.id, u.precio]));
      if (Object.keys(map).length === 0) throw new Error("sin datos");
      setCartera(cs => cs.map(p => map[p.id] != null ? { ...p, precio: map[p.id] } : p));
    } catch {
      alert("Yahoo no disponible desde el navegador (CORS). Conéctalo en tu backend vía fetchYahooPrice(ticker). Mientras, edita el precio a mano.");
    } finally { setCargandoPrecios(false); }
  };

  const scoreColor = score.total >= 8 ? palette.acc : score.total >= 6 ? palette.warn : palette.bad;
  const TIPO_LABEL: Record<TipoPosicion, string> = { fondo:"Fondo", etf:"ETF", cripto:"Cripto", efectivo:"Efectivo" };
  const tiposDisponibles: TipoPosicion[] = ["fondo","etf","cripto","efectivo"];
  const filasRV: Array<[string, string, number]> = [["world","World",60],["em","Emergentes",20],["nasdaq","Nasdaq",20]];

  return (
    <>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16, justifyContent:"flex-start" }}>
        <button className="seg" onClick={actualizarPrecios} disabled={cargandoPrecios}>{cargandoPrecios ? "Actualizando…" : "↻ Actualizar precios (Yahoo)"}</button>
        <button className="seg on" onClick={() => setEditando(e => !e)}>{editando ? "Cerrar edición" : "Editar cartera"}</button>
      </div>

      <div className="card" style={{ marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:20 }}>
        <div>
          <div className="num disp" style={{ fontSize:"clamp(40px,9vw,68px)", fontWeight:600, lineHeight:1 }}>{formatEuroWithCents(total)}</div>
          <div style={{ marginTop:10, fontSize:15 }} className="num">
            <span style={{ color: variacion>=0 ? palette.acc : palette.bad }}>{variacion>=0?"▲":"▼"} {formatEuroWithCents(Math.abs(variacion))} ({variacionPct>=0?"+":""}{variacionPct.toFixed(2)}%)</span>
            <span style={{ color:palette.faint }}> desde el último mes registrado</span>
          </div>
          <div style={{ marginTop:6, fontSize:12.5 }} className="num">
            <span style={{ color:palette.sub }}>Patrimonio neto (activos − deudas): </span>
            <span style={{ color: patrimonioNeto>=0?palette.acc:palette.bad, fontWeight:600 }}>{formatEuroWithCents(patrimonioNeto)}</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
          <Metric label="Invertido" value={formatEuro(invertido)} sub={`${formatPercent(total?invertido/total*100:0)} del total`} />
          <Metric label="Liquidez" value={formatEuro(liquidezTotal)} sub={`${formatPercent(total?liquidezTotal/total*100:0)} del total`} />
          <Metric label="Bitcoin" value={formatEuro(btcTotal)} sub={`${formatPercent(btcPesoTotal)} del total`} />
        </div>
      </div>

      {editando && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="eyebrow" style={{ marginBottom:6 }}>Editar cartera</div>
          <p style={{ margin:"0 0 16px", fontSize:12.5, color:palette.sub, lineHeight:1.5 }}>
            Cada posición: <strong style={{color:palette.ink}}>nombre, ticker de Yahoo y participaciones</strong>. El precio lo trae Yahoo por su ticker (botón ↻).
            En efectivo introduces el saldo en €. Añade, edita o borra posiciones cuando rebalancees.
          </p>
          <div className="grid">
            {cartera.map((p) => (
              <div key={p.id} className="poscard">
                <div className="posrow">
                  <label>
                    <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Nombre</div>
                    <input className="inp" value={p.nombre} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editar(p.id,"nombre",event.target.value)} style={{fontFamily:"'DM Sans',sans-serif"}} />
                  </label>
                  <label>
                    <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Tipo</div>
                    <select className="inp" value={p.tipo} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => editar(p.id,"tipo",event.target.value)}>
                      {tiposDisponibles.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                    </select>
                  </label>
                  {p.tipo === "efectivo" ? (
                    <label style={{ gridColumn:"span 2" }}>
                      <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Saldo €</div>
                      <input className="inp" type="number" step="any" value={p.participaciones} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editar(p.id,"participaciones",event.target.value)} />
                    </label>
                  ) : (
                    <>
                      <label>
                        <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Ticker Yahoo</div>
                        <input className="inp" value={p.ticker} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editar(p.id,"ticker",event.target.value)} placeholder="ej. CNDX.L" />
                      </label>
                      <label>
                        <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>{p.tipo==="cripto"?"Cantidad":"Particip."}</div>
                        <input className="inp" type="number" step="any" value={p.participaciones} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editar(p.id,"participaciones",event.target.value)} />
                      </label>
                    </>
                  )}
                  <button className="seg" onClick={() => borrar(p.id)} title="Borrar posición" style={{ color:palette.bad, height:38 }}>✕</button>
                </div>
                {p.tipo !== "efectivo" && (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:10, paddingTop:10, borderTop:`1px solid ${palette.line}`, flexWrap:"wrap", gap:8 }}>
                    <label style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:palette.faint }}>Precio (Yahoo / manual)</span>
                      <input className="inp" type="number" step="any" value={p.precio} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editar(p.id,"precio",event.target.value)} style={{ width:120 }} />
                    </label>
                    <span className="num" style={{ fontSize:15, fontWeight:600, color:palette.acc }}>= {formatEuroWithCents((p.participaciones||0)*(p.precio||0))}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
            <button className="seg" onClick={() => anadir("fondo")}>+ Fondo</button>
            <button className="seg" onClick={() => anadir("etf")}>+ ETF</button>
            <button className="seg" onClick={() => anadir("cripto")}>+ Cripto</button>
            <button className="seg" onClick={() => anadir("efectivo")}>+ Efectivo</button>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom:16 }}>Nota de la cartera</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:12, marginBottom:18 }}>
            <span className="num disp" style={{ fontSize:56, fontWeight:600, color:scoreColor, lineHeight:1 }}>{score.total.toFixed(1)}</span>
            <span className="num" style={{ fontSize:20, color:palette.faint }}>/ 10</span>
          </div>
          {score.detalle.map(([n,v]) => (
            <div key={n} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:4 }}>
                <span style={{ color:palette.sub }}>{n}</span><span className="num" style={{ color:palette.ink }}>{v.toFixed(1)}</span>
              </div>
              <div className="barra"><div className="barra-fill" style={{ width:`${v*10}%`, background: v>=8?palette.acc:v>=6?palette.warn:palette.bad }} /></div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom:8 }}>Distribución del patrimonio</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieCartera} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2} stroke="none">
                {pieCartera.map((e,sliceIndex) => <Cell key={sliceIndex} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(value) => formatEuroWithCents(Number(value))} itemStyle={{color:palette.ink}} labelStyle={{color:palette.sub}} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8,color:palette.ink}} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginTop:8 }}>
            {pieCartera.map((e) => (
              <span key={e.name} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:palette.sub }}>
                <span style={{ width:9, height:9, borderRadius:2, background:e.color }} />
                {e.name} <span className="num" style={{ color:palette.ink }}>{formatPercent(total?e.value/total*100:0)}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom:16 }}>Estado del plan</div>
          {alertas.map((a,alertaIndex) => (
            <div key={alertaIndex} style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
              <span style={{ marginTop:2, width:8, height:8, borderRadius:"50%", flexShrink:0, background: a.t==="good"?palette.acc:a.t==="warn"?palette.warn:palette.bad }} />
              <span style={{ fontSize:13, lineHeight:1.5, color: a.t==="good"?palette.sub:palette.ink }}>{a.m}</span>
            </div>
          ))}
          <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${palette.line}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, color:palette.sub, marginBottom:6 }}>
              <span>Reglas BTC (por peso)</span><span className="num">{formatPercent(btcPesoTotal)} actual</span>
            </div>
            <div style={{ fontSize:11.5, color:palette.faint, lineHeight:1.6 }}>Pausar si &gt;40% y cartera &gt;10k · Vender si &gt;50% y cartera &gt;20k</div>
          </div>
        </div>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom:16 }}>Renta variable · real vs objetivo {estanflacion && <span style={{color:palette.warn}}>· estanflación</span>}</div>
          {filasRV.map(([k,label,obj]) => {
            const existe = cartera.some(p => p.id === k);
            const peso = pesoRVde(k);
            return (
              <div key={k} style={{ marginBottom:16, opacity: existe?1:.4 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5 }}>
                  <span style={{ color:palette.ink }}>{label}</span>
                  <span className="num"><span style={{color:palette.ink}}>{formatPercent(peso)}</span> <span style={{color:palette.faint}}>/ {obj}%</span></span>
                </div>
                <div style={{ position:"relative", height:7, background:palette.panel2, borderRadius:4 }}>
                  <div style={{ position:"absolute", left:`${obj}%`, top:-2, bottom:-2, width:2, background:palette.faint, opacity:.7 }} />
                  <div style={{ height:"100%", width:`${Math.min(100,peso)}%`, background:palette.acc, borderRadius:4 }} />
                </div>
              </div>
            );
          })}
          <button className="seg" style={{ marginTop:4, width:"100%" }} onClick={() => setEstanflacion(e=>!e)}>
            Modo estanflación: {estanflacion ? "activo (120/60/20)" : "normal (120/40/40)"}
          </button>
        </div>

        <div className="card span-full">
          <div className="eyebrow" style={{ marginBottom:16 }}>Evolución del patrimonio</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={historico} margin={{ left:-10, right:10, top:6 }}>
              <CartesianGrid stroke={palette.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="mes" stroke={palette.faint} tick={{ fontSize:12, fontFamily:"DM Mono" }} />
              <YAxis stroke={palette.faint} tick={{ fontSize:12, fontFamily:"DM Mono" }} tickFormatter={(value)=>`${(Number(value)/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value)=>formatEuroWithCents(Number(value))} cursor={{ stroke: palette.faint, strokeWidth: 1 }} itemStyle={{color:palette.ink}} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8}} labelStyle={{color:palette.sub}} />
              <Line type="monotone" dataKey="total" stroke={palette.acc} strokeWidth={2.5} dot={{ r:3, fill:palette.acc }} activeDot={{ r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom:14 }}>Fondo de emergencia / casa</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:4 }}>
            <span className="num disp" style={{ fontSize:34, fontWeight:600 }}>{formatEuro(liquidezTotal)}</span>
            <span className="num" style={{ color:palette.faint }}>/ {formatEuro(OBJETIVOS.fondoEmergencia)}</span>
          </div>
          <div style={{ height:10, background:palette.panel2, borderRadius:6, overflow:"hidden", margin:"14px 0 10px", position:"relative" }}>
            <div style={{ position:"absolute", left:`${OBJETIVOS.fondoMinimo/OBJETIVOS.fondoEmergencia*100}%`, top:0, bottom:0, width:2, background:palette.ink, opacity:.5, zIndex:2 }} />
            <div style={{ height:"100%", width:`${Math.min(100,liquidezTotal/OBJETIVOS.fondoEmergencia*100)}%`, background:`linear-gradient(90deg,${palette.faint},${palette.acc})`, borderRadius:6 }} />
          </div>
          <div style={{ fontSize:12, color:palette.sub }}>
            {liquidezTotal < OBJETIVOS.fondoMinimo
              ? `Faltan ${formatEuro(OBJETIVOS.fondoMinimo-liquidezTotal)} para el mínimo intocable.`
              : `${formatPercent(liquidezTotal/OBJETIVOS.fondoEmergencia*100)} del objetivo. Cubre ~${(liquidezTotal/778.89).toFixed(1)} meses de gastos.`}
          </div>
        </div>

        {compKeys.length > 0 && (
          <div className="card span-2" style={{ minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:16 }}>
              <div className="eyebrow">Qué hay dentro de cada fondo</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {compKeys.map(k => <button key={k} className={`seg ${drillActivo===k?"on":""}`} onClick={()=>setDrilldown(k)}>{COMPOSICION[k].nombre.split(" ").slice(-1)[0]}</button>)}
                <span style={{ width:1, background:palette.line, margin:"0 4px" }} />
                {([["paises","Países"],["sectores","Sectores"]] as Array<[VistaComposicion, string]>).map(([k,l]) => <button key={k} className={`seg ${vista===k?"on":""}`} onClick={()=>setVista(k)}>{l}</button>)}
              </div>
            </div>
            <div className="compo">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={compData} layout="vertical" margin={{ left:0, right:16 }}>
                  <XAxis type="number" hide domain={[0,"dataMax"]} />
                  <YAxis type="category" dataKey="n" width={88} stroke={palette.faint} tick={{ fontSize:11.5 }} />
                  <Tooltip formatter={(value)=>`${value}%`} itemStyle={{color:palette.ink}} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8}} cursor={{fill:palette.panel2}} />
                  <Bar dataKey="v" radius={[0,4,4,0]}>{compData.map((_entry,barIndex)=><Cell key={barIndex} fill={seriesColorAt(barIndex)} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="hide-sm">
                <div style={{ fontSize:13, color:palette.sub, lineHeight:1.7 }}>
                  <strong style={{ color:palette.ink }}>{comp?.nombre}</strong><br/>
                  {vista==="paises"
                    ? `Exposición geográfica. ${compData[0]?.n} pesa ${compData[0]?.v}%: tu mayor concentración vía este fondo.`
                    : `Reparto sectorial. Tecnología pesa ${comp?.sectores.find(s=>s.n==="Tecnología")?.v ?? 0}% aquí.`}
                  <br/><br/><span style={{ color:palette.faint, fontSize:12 }}>Composición orientativa (jun 2026), se actualiza despacio.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================================================================
   PESTAÑA 2 — PRESUPUESTO
   ============================================================================ */
interface BorradorDesglose {
  ingresoNetoOverride: number | null;
  overrides: Partial<Record<CategoriaId, number>>;
  real: Partial<Record<CategoriaId, number | null>>;
}

type CampoPresupuestoBaseEditable = "ingresoNeto" | CategoriaId;
type CampoGastoFijoEditable = "nombre" | "importe";

function PresupuestoTab({ presupuestoBase, setPresupuestoBase, meses, setMeses, gastosFijosItems, setGastosFijosItems }: PresupuestoTabProps): React.JSX.Element {
  // --------- Presupuesto base anual: modo visual + modo edición con borrador y Guardar ---------
  const [baseEditando, setBaseEditando] = useState<boolean>(false);
  const [baseGuardadoOk, setBaseGuardadoOk] = useState<boolean>(false);
  const [baseBorrador, setBaseBorrador] = useState<PresupuestoBaseBorrador>(() => ({ ...presupuestoBase, gastosFijosItems }));
  const [nuevoGastoFijo, setNuevoGastoFijo] = useState<{ nombre: string; importe: string }>({ nombre:"", importe:"" });

  const totalGastosFijosBorrador = useMemo(() => baseBorrador.gastosFijosItems.reduce((s,i)=>s+(i.importe||0),0), [baseBorrador.gastosFijosItems]);

  const iniciarEdicionBase = (): void => {
    setBaseBorrador({ ...presupuestoBase, gastosFijosItems: gastosFijosItems.map(i => ({ ...i })) });
    setBaseEditando(true);
  };
  const cancelarEdicionBase = (): void => setBaseEditando(false);
  const guardarBase = (): void => {
    setPresupuestoBase({
      ingresoNeto: baseBorrador.ingresoNeto,
      gastosFijos: totalGastosFijosBorrador,
      inversion: baseBorrador.inversion,
      fondoEmergencia: baseBorrador.fondoEmergencia,
      ocio: baseBorrador.ocio,
      caprichos: baseBorrador.caprichos,
    });
    setGastosFijosItems(baseBorrador.gastosFijosItems);
    setBaseEditando(false);
    setBaseGuardadoOk(true);
    setTimeout(() => setBaseGuardadoOk(false), 2000);
  };

  const editarBaseBorrador = (campo: CampoPresupuestoBaseEditable, valor: string): void => setBaseBorrador(b => ({ ...b, [campo]: parseFloat(valor) || 0 }));
  const editarGastoFijo = (id: string, campo: CampoGastoFijoEditable, valor: string): void => setBaseBorrador(b => ({
    ...b, gastosFijosItems: b.gastosFijosItems.map(i => i.id !== id ? i : { ...i, [campo]: campo === "importe" ? (parseFloat(valor) || 0) : valor } as GastoFijoItem)
  }));
  const borrarGastoFijo = (id: string): void => setBaseBorrador(b => ({ ...b, gastosFijosItems: b.gastosFijosItems.filter(i => i.id !== id) }));
  const anadirGastoFijo = (): void => {
    if (!nuevoGastoFijo.nombre || !nuevoGastoFijo.importe) return;
    setBaseBorrador(b => ({ ...b, gastosFijosItems: [...b.gastosFijosItems, { id: generateId(), nombre: nuevoGastoFijo.nombre, importe: parseFloat(nuevoGastoFijo.importe) || 0 }] }));
    setNuevoGastoFijo({ nombre:"", importe:"" });
  };

  const mesesDisponibles = useMemo(() => meses.filter(m => esMesDisponible(m.fecha)), [meses]);
  const ultimoDisponibleId = mesesDisponibles[mesesDisponibles.length - 1]?.id;

  const [mesId, setMesId] = useState<string | undefined>(ultimoDisponibleId);
  const [nuevoEvento, setNuevoEvento] = useState<{ nombre: string; importe: string; categoria: CategoriaEvento }>({ nombre:"", importe:"", categoria:"gastosFijos" });
  const [desgloseAbierto, setDesgloseAbierto] = useState<boolean>(true);
  const [guardadoOk, setGuardadoOk] = useState<boolean>(false);

  // Si el mes seleccionado deja de estar disponible (no debería, pero por seguridad), se deriva
  // directamente el último disponible en el propio render, sin useEffect.
  const mesIdEfectivo = mesesDisponibles.some(m => m.id === mesId) ? mesId : ultimoDisponibleId;

  const mesIndex = meses.findIndex(m => m.id === mesIdEfectivo);
  const mes = meses[mesIndex] ?? meses[meses.length - 1];
  const calculo = useMemo(() => presupuestoMensualCalculator.calcular(mes, presupuestoBase), [mes, presupuestoBase]);

  // --------- Borrador editable del desglose: no toca "meses" hasta pulsar Guardar ---------
  const [borrador, setBorrador] = useState<BorradorDesglose>({ ingresoNetoOverride: mes.ingresoNetoOverride, overrides: mes.overrides, real: mes.real });
  const [mesIdSincronizado, setMesIdSincronizado] = useState<string>(mes.id);
  if (mes.id !== mesIdSincronizado) {
    setMesIdSincronizado(mes.id);
    setBorrador({ ingresoNetoOverride: mes.ingresoNetoOverride, overrides: mes.overrides, real: mes.real });
    setGuardadoOk(false);
  }

  const calculoBorrador = useMemo(() => presupuestoMensualCalculator.calcular({ ...mes, ingresoNetoOverride: borrador.ingresoNetoOverride, overrides: borrador.overrides, real: borrador.real }, presupuestoBase), [mes, borrador, presupuestoBase]);

  const hayCambiosSinGuardar = JSON.stringify(borrador) !== JSON.stringify({ ingresoNetoOverride: mes.ingresoNetoOverride, overrides: mes.overrides, real: mes.real });

  const totalBase = CATEGORIAS.reduce((s,c)=>s+presupuestoBase[c.id],0);
  const sinAsignarBase = presupuestoBase.ingresoNeto - totalBase;

  const editarOverrideBorrador = (catId: CategoriaId, valor: string): void => setBorrador(b => ({
    ...b, overrides: { ...b.overrides, [catId]: valor === "" ? undefined : (parseFloat(valor) || 0) }
  }));
  const editarRealBorrador = (catId: CategoriaId, valor: string): void => setBorrador(b => ({
    ...b, real: { ...b.real, [catId]: valor === "" ? null : (parseFloat(valor) || 0) }
  }));
  const editarIngresoOverrideBorrador = (valor: string): void => setBorrador(b => ({
    ...b, ingresoNetoOverride: valor === "" ? null : (parseFloat(valor) || 0)
  }));

  const guardarDesglose = (): void => {
    setMeses(ms => ms.map(m => m.id !== mes.id ? m : { ...m, ingresoNetoOverride: borrador.ingresoNetoOverride, overrides: borrador.overrides, real: borrador.real }));
    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 2000);
  };
  const descartarCambios = (): void => setBorrador({ ingresoNetoOverride: mes.ingresoNetoOverride, overrides: mes.overrides, real: mes.real });

  const anadirEvento = (): void => {
    if (!nuevoEvento.nombre || !nuevoEvento.importe) return;
    setMeses(ms => ms.map(m => m.id !== mes.id ? m : {
      ...m, eventos: [...m.eventos, { id: generateId(), nombre: nuevoEvento.nombre, importe: parseFloat(nuevoEvento.importe) || 0, categoria: nuevoEvento.categoria }]
    }));
    setNuevoEvento({ nombre:"", importe:"", categoria:"gastosFijos" });
  };
  const borrarEvento = (eventoId: string): void => setMeses(ms => ms.map(m => m.id !== mes.id ? m : {
    ...m, eventos: m.eventos.filter(e => e.id !== eventoId)
  }));

  const datosMesGrafico = CATEGORIAS.map(c => ({
    nombre: c.nombre.split(" ")[0],
    Presupuestado: calculo.valores[c.id],
    Real: calculo.real[c.id] != null ? calculo.real[c.id] : calculo.valores[c.id],
  }));

  const evolucionAnual = useMemo(() => meses.map(m => {
    const cal = presupuestoMensualCalculator.calcular(m, presupuestoBase);
    const ahorroPres = cal.valores.inversion + cal.valores.fondoEmergencia;
    const gastoPres = cal.valores.gastosFijos + cal.valores.ocio + cal.valores.caprichos;
    const ahorroRegistrado = cal.real.inversion != null || cal.real.fondoEmergencia != null;
    const gastoRegistrado = cal.real.gastosFijos != null || cal.real.ocio != null || cal.real.caprichos != null;
    const ahorroReal = ahorroRegistrado ? (cal.real.inversion ?? cal.valores.inversion) + (cal.real.fondoEmergencia ?? cal.valores.fondoEmergencia) : null;
    const gastoReal = gastoRegistrado ? (cal.real.gastosFijos ?? cal.valores.gastosFijos) + (cal.real.ocio ?? cal.valores.ocio) + (cal.real.caprichos ?? cal.valores.caprichos) : null;
    return { mes: m.mes, ahorroPres, ahorroReal, gastoPres, gastoReal };
  }), [meses, presupuestoBase]);

  const datosBaseDonut = CATEGORIAS.map((c,i) => ({ name: c.nombre, value: presupuestoBase[c.id], color: seriesColorAt(i) }));
  const sinAsignarBorrador = baseBorrador.ingresoNeto - (totalGastosFijosBorrador + baseBorrador.inversion + baseBorrador.fondoEmergencia + baseBorrador.ocio + baseBorrador.caprichos);

  return (
    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>

      <div className="card span-full">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:6 }}>
          <div className="eyebrow">Presupuesto base anual</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {baseGuardadoOk && <span style={{ fontSize:12, color:palette.acc }}>Guardado ✓</span>}
            {!baseEditando && <button className="seg on" onClick={iniciarEdicionBase}>Editar presupuesto</button>}
          </div>
        </div>
        <p style={{ margin:"0 0 16px", fontSize:12.5, color:palette.sub, lineHeight:1.5 }}>
          Esto es tu plantilla por defecto para cada mes del año. Cada mes concreto puede desviarse (sueldo distinto, un gasto extra, una deuda puntual) sin tocar esta base.
        </p>

        {!baseEditando ? (
          <div className="compo">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={datosBaseDonut} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={2} stroke="none">
                  {datosBaseDonut.map((e,sliceIndex) => <Cell key={sliceIndex} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(value)=>formatEuroWithCents(Number(value))} itemStyle={{color:palette.ink}} labelStyle={{color:palette.sub}} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8,color:palette.ink}} />
              </PieChart>
            </ResponsiveContainer>
            <div>
              <div style={{ marginBottom:14 }}>
                <div className="eyebrow" style={{ marginBottom:4 }}>Ingreso neto /mes</div>
                <div className="num disp" style={{ fontSize:28, fontWeight:600 }}>{formatEuroWithCents(presupuestoBase.ingresoNeto)}</div>
              </div>
              {datosBaseDonut.map(e => (
                <div key={e.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, fontSize:13 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:8, color:palette.sub }}>
                    <span style={{ width:9, height:9, borderRadius:2, background:e.color }} />
                    {e.name}
                  </span>
                  <span className="num" style={{ color:palette.ink }}>{formatEuroWithCents(e.value)} <span style={{ color:palette.faint }}>({formatPercent(presupuestoBase.ingresoNeto ? e.value/presupuestoBase.ingresoNeto*100 : 0)})</span></span>
                </div>
              ))}
              <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${palette.line}`, fontSize:12.5 }} className="num">
                <span style={{ color:palette.sub }}>Sin asignar: </span>
                <span style={{ color: Math.abs(sinAsignarBase) < 5 ? palette.acc : palette.warn, fontWeight:600 }}>{formatEuroWithCents(sinAsignarBase)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))" }}>
              <label>
                <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Ingreso neto /mes</div>
                <input className="inp" type="number" step="any" value={baseBorrador.ingresoNeto} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarBaseBorrador("ingresoNeto",event.target.value)} />
              </label>
              {CATEGORIAS.filter(c => c.id !== "gastosFijos").map(c => (
                <label key={c.id}>
                  <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>{c.nombre}</div>
                  <input className="inp" type="number" step="any" value={baseBorrador[c.id]} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarBaseBorrador(c.id,event.target.value)} />
                </label>
              ))}
            </div>

            <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${palette.line}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <span style={{ fontSize:13, color:palette.ink }}>Gastos fijos (desglose)</span>
                <span className="num" style={{ fontSize:16, fontWeight:600, color:palette.ink }}>{formatEuroWithCents(totalGastosFijosBorrador)}</span>
              </div>
              {baseBorrador.gastosFijosItems.map(item => (
                <div key={item.id} className="gf-row" style={{ marginBottom:8 }}>
                  <input className="inp" value={item.nombre} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarGastoFijo(item.id,"nombre",event.target.value)} style={{fontFamily:"'DM Sans',sans-serif"}} />
                  <input className="inp" type="number" step="any" value={item.importe} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarGastoFijo(item.id,"importe",event.target.value)} />
                  <button className="seg" onClick={()=>borrarGastoFijo(item.id)} style={{ color:palette.bad }}>✕</button>
                </div>
              ))}
              <div className="gf-row" style={{ marginTop:10 }}>
                <input className="inp" placeholder="Nuevo gasto fijo (ej. alquiler, seguro...)" value={nuevoGastoFijo.nombre} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setNuevoGastoFijo(n=>({...n,nombre:event.target.value}))} style={{fontFamily:"'DM Sans',sans-serif"}} />
                <input className="inp" type="number" step="any" placeholder="Importe" value={nuevoGastoFijo.importe} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setNuevoGastoFijo(n=>({...n,importe:event.target.value}))} />
                <button className="seg on" onClick={anadirGastoFijo}>+ Añadir</button>
              </div>
              <div style={{ fontSize:11.5, color:palette.faint, marginTop:10 }}>El total de estas partidas es el número de &quot;Gastos fijos&quot; que se usa en toda la pestaña de Presupuesto.</div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginTop:16, paddingTop:16, borderTop:`1px solid ${palette.line}` }}>
              <div className="num" style={{ fontSize:12.5 }}>
                <span style={{ color:palette.sub }}>Sin asignar: </span>
                <span style={{ color: Math.abs(sinAsignarBorrador) < 5 ? palette.acc : palette.warn, fontWeight:600 }}>{formatEuroWithCents(sinAsignarBorrador)}</span>
                <span style={{ color:palette.faint }}> {Math.abs(sinAsignarBorrador) < 5 ? "(cuadra con el ingreso neto)" : "(revisa: no cuadra con el ingreso neto)"}</span>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="seg" onClick={cancelarEdicionBase}>Cancelar</button>
                <button className="seg on" onClick={guardarBase}>Guardar cambios</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card span-full" style={{ paddingBottom:14 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>Cargar información del mes</div>
        <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <select className="inp" value={mes.id} onChange={(event: React.ChangeEvent<HTMLSelectElement>)=>setMesId(event.target.value)} style={{ maxWidth:220 }}>
            {mesesDisponibles.map(m => {
              const desviado = Object.keys(m.overrides||{}).length>0 || (m.eventos||[]).length>0;
              return <option key={m.id} value={m.id}>{m.mes}{desviado ? " ·" : ""}</option>;
            })}
          </select>
          <span style={{ fontSize:11.5, color:palette.faint }}>Solo se muestran meses ya iniciados (previos o el actual). Los meses futuros aparecerán cuando llegue su turno.</span>
        </div>
      </div>

      <div className="card span-2">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <button className="eyebrow" onClick={()=>setDesgloseAbierto(o=>!o)} style={{ background:"none", border:"none", padding:0, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ display:"inline-block", transition:".15s", transform: desgloseAbierto?"rotate(90deg)":"rotate(0deg)" }}>▸</span>
            {mes.mes} · desglose
          </button>
          <div className="num" style={{ fontSize:12.5 }}>
            <span style={{ color:palette.sub }}>Sobrante (guardado): </span>
            <span style={{ color: calculo.sobrante >= 0 ? palette.acc : palette.bad, fontWeight:600 }}>{formatEuroWithCents(calculo.sobrante)}</span>
          </div>
        </div>

        {desgloseAbierto && (
        <div style={{ marginTop:16 }}>
        <label style={{ display:"block", marginBottom:16 }}>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Ingreso neto este mes {borrador.ingresoNetoOverride==null && <span style={{color:palette.faint}}>(base: {formatEuro(presupuestoBase.ingresoNeto)})</span>}</div>
          <input className="inp" type="number" step="any" placeholder={String(presupuestoBase.ingresoNeto)} value={borrador.ingresoNetoOverride ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarIngresoOverrideBorrador(event.target.value)} style={{ maxWidth:200 }} />
        </label>

        {CATEGORIAS.map(c => {
          const base = presupuestoBase[c.id];
          const presupuestado = calculoBorrador.valores[c.id];
          const real = calculoBorrador.real[c.id];
          const registrado = real != null;
          const delta = registrado ? real - presupuestado : 0;
          const bien = c.tipo === "ahorro" ? delta >= 0 : delta <= 0;
          return (
            <div key={c.id} style={{ marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${palette.line}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6, flexWrap:"wrap", gap:6 }}>
                <span style={{ fontSize:13, color:palette.ink }}>{c.nombre}</span>
                <span className="num" style={{ fontSize:12.5, color:palette.faint }}>base {formatEuro(base)}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <label>
                  <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Presupuestado (override mes)</div>
                  <input className="inp" type="number" step="any" placeholder={String(base)} value={borrador.overrides?.[c.id] ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarOverrideBorrador(c.id,event.target.value)} />
                </label>
                <label>
                  <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Real</div>
                  <input className="inp" type="number" step="any" placeholder="sin registrar" value={real ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarRealBorrador(c.id,event.target.value)} />
                </label>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11.5 }} className="num">
                <span style={{ color:palette.sub }}>Total presupuestado: {formatEuroWithCents(presupuestado)}</span>
                {registrado && <span style={{ color: bien ? palette.acc : palette.bad }}>{delta>=0?"+":""}{formatEuroWithCents(delta)} vs plan</span>}
              </div>
            </div>
          );
        })}

        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
          <button className={`seg ${hayCambiosSinGuardar ? "on" : ""}`} onClick={guardarDesglose} disabled={!hayCambiosSinGuardar}>Guardar cambios</button>
          {hayCambiosSinGuardar && <button className="seg" onClick={descartarCambios}>Descartar</button>}
          {guardadoOk && <span style={{ fontSize:12, color:palette.acc }}>Guardado ✓</span>}
          {!guardadoOk && hayCambiosSinGuardar && <span style={{ fontSize:12, color:palette.warn }}>Cambios sin guardar</span>}
        </div>

        <div className="eyebrow" style={{ margin:"18px 0 10px" }}>Eventos / ajustes de este mes</div>
        {mes.eventos.length === 0 && <div style={{ fontSize:12.5, color:palette.faint, marginBottom:10 }}>Sin ajustes puntuales este mes.</div>}
        {mes.eventos.map(ev => (
          <div key={ev.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:8, fontSize:12.5 }}>
            <span style={{ color:palette.ink }}>{ev.nombre} <span style={{ color:palette.faint }}>({CATEGORIA_LABEL[ev.categoria] || ev.categoria})</span></span>
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span className="num" style={{ color:palette.warn }}>+{formatEuroWithCents(ev.importe)}</span>
              <button className="seg" onClick={()=>borrarEvento(ev.id)} style={{ color:palette.bad, padding:"3px 8px" }}>✕</button>
            </span>
          </div>
        ))}
        <div className="evt-row" style={{ marginTop:10 }}>
          <input className="inp" placeholder="Nombre (ej. deuda puntual)" value={nuevoEvento.nombre} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setNuevoEvento(n=>({...n,nombre:event.target.value}))} style={{fontFamily:"'DM Sans',sans-serif"}} />
          <input className="inp" type="number" step="any" placeholder="Importe" value={nuevoEvento.importe} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setNuevoEvento(n=>({...n,importe:event.target.value}))} />
          <select className="inp" value={nuevoEvento.categoria} onChange={(event: React.ChangeEvent<HTMLSelectElement>)=>setNuevoEvento(n=>({...n,categoria:event.target.value as CategoriaEvento}))}>
            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            <option value="ingreso">Ingreso (sueldo, extra)</option>
          </select>
          <button className="seg on" onClick={anadirEvento}>+ Añadir</button>
        </div>
        </div>
        )}
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:14 }}>{mes.mes} · presupuestado vs real</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={datosMesGrafico} margin={{ left:-16, right:8, top:6 }}>
            <CartesianGrid stroke={palette.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="nombre" stroke={palette.faint} tick={{ fontSize:10.5, fontFamily:"DM Mono" }} interval={0} />
            <YAxis stroke={palette.faint} tick={{ fontSize:11, fontFamily:"DM Mono" }} tickFormatter={(value)=>`${value}`} />
            <Tooltip formatter={(value)=>formatEuroWithCents(Number(value))} cursor={{ fill: palette.panel2 }} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8}} labelStyle={{color:palette.sub}} itemStyle={{color:palette.ink}} />
            <Legend wrapperStyle={{ fontSize:12 }} />
            <Bar dataKey="Presupuestado" fill={palette.faint} radius={[4,4,0,0]} />
            <Bar dataKey="Real" fill={palette.acc} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card span-full">
        <div className="eyebrow" style={{ marginBottom:6 }}>Evolución anual · ahorro vs gasto (presupuestado y real)</div>
        <p style={{ margin:"0 0 14px", fontSize:12, color:palette.faint, lineHeight:1.5 }}>
          Lo &quot;real&quot; solo aparece en los meses que ya has registrado en el desglose.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={evolucionAnual} margin={{ left:-10, right:10, top:6 }}>
            <CartesianGrid stroke={palette.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="mes" stroke={palette.faint} tick={{ fontSize:11.5, fontFamily:"DM Mono" }} />
            <YAxis stroke={palette.faint} tick={{ fontSize:12, fontFamily:"DM Mono" }} />
            <Tooltip formatter={(value)=>(value==null?"sin registrar":formatEuroWithCents(Number(value)))} cursor={{ stroke: palette.faint, strokeWidth: 1 }} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8}} labelStyle={{color:palette.sub}} itemStyle={{color:palette.ink}} />
            <Legend wrapperStyle={{ fontSize:12 }} />
            <Line type="monotone" dataKey="ahorroPres" name="Ahorro presupuestado" stroke="#7e9c8a" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="ahorroReal" name="Ahorro real" stroke={palette.acc} strokeWidth={3} dot={{ r:4 }} connectNulls={false} />
            <Line type="monotone" dataKey="gastoPres" name="Gasto presupuestado" stroke="#b0654f" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="gastoReal" name="Gasto real" stroke={palette.warn} strokeWidth={3} dot={{ r:4 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ============================================================================
   PESTAÑA 3 — METAS
   ============================================================================ */
type CampoDeudaEditable = "cuota" | "saldo";

function MetasTab({
  derivada, deudas, setDeudas,
  salarioActual, setSalarioActual,
  aportacionFI, setAportacionFI,
  rentabilidadFI, setRentabilidadFI,
  huchaBTC, setHuchaBTC,
  condicionesBTC, setCondicionesBTC,
  contarCoche, setContarCoche,
}: MetasTabProps): React.JSX.Element {
  const { total, invertido, liquidezTotal } = derivada;

  const deudaCoche = deudas.find(d => d.id === "coche");
  const deudaTotal = deudas.reduce((s,d)=>s+(d.saldo||0),0);
  const deudaSinCoche = deudaTotal - (deudaCoche?.saldo || 0);
  const patrimonioNeto = contarCoche ? total - deudaSinCoche : total - deudaTotal;

  const editarDeuda = (id: string, campo: CampoDeudaEditable, valor: string): void => setDeudas(ds => ds.map(d => d.id===id ? { ...d, [campo]: parseFloat(valor)||0 } : d));
  const marcarLiquidada = (id: string): void => setDeudas(ds => ds.map(d => d.id===id ? { ...d, saldo: 0 } : d));

  const diasApplewatch = useMemo((): number | null => {
    const d = deudas.find(x => x.id === "applewatch");
    if (!d || d.saldo <= 0 || !d.limite) return null;
    return Math.ceil((new Date(d.limite).getTime() - new Date().getTime()) / 86400000);
  }, [deudas]);

  const proyeccion = useMemo(() => proyeccionFinancieraCalculator.proyectar({
    inicial: total, aportacion: aportacionFI, rentabilidadAnual: rentabilidadFI, objetivo: OBJETIVO_FI.capital,
  }), [total, aportacionFI, rentabilidadFI]);
  const aniosFI: number | null = proyeccion.meses ? proyeccion.meses/12 : null;
  const anioObjetivoFI: number | null = proyeccion.meses && aniosFI != null ? new Date().getFullYear() + Math.ceil(aniosFI) : null;
  const edadObjetivoFI: number | null = proyeccion.meses && aniosFI != null ? (OBJETIVO_FI.edadActual + aniosFI) : null;

  const faseActual = useMemo((): Fase => {
    const cumplidas = FASES.filter(f => salarioActual >= f.salarioMin && total >= f.carteraMin);
    return cumplidas.length ? cumplidas[cumplidas.length-1] : FASES[0];
  }, [salarioActual, total]);
  const faseSiguiente = FASES.find(f => f.id === faseActual.id + 1);

  const condFondo = liquidezTotal >= OBJETIVOS.fondoMinimo;

  return (
    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>

      {diasApplewatch != null && diasApplewatch >= 0 && (
        <div className="card span-full" style={{ borderColor: diasApplewatch<=3?palette.bad:palette.warn, background: diasApplewatch<=3 ? "#2a1710" : palette.panel }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <span style={{ fontSize:22 }}>⚠</span>
            <div>
              <div style={{ fontSize:14, color:palette.ink, fontWeight:600 }}>Liquidar Apple Watch (revolving 24% TAE)</div>
              <div style={{ fontSize:12.5, color:palette.sub, marginTop:2 }}>Quedan <strong style={{color:palette.ink}}>{diasApplewatch} día{diasApplewatch===1?"":"s"}</strong> antes del 10 de julio de 2026. Saldo: {formatEuroWithCents(deudas.find(d=>d.id==="applewatch")?.saldo || 0)}. Pasa la tarjeta a pago total y no la vuelvas a usar en revolving.</div>
            </div>
          </div>
        </div>
      )}

      <div className="card span-2">
        <div className="eyebrow" style={{ marginBottom:8 }}>Libertad financiera</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:32, fontWeight:600 }}>{formatEuro(total)}</span>
          <span className="num" style={{ color:palette.faint }}>/ {formatEuro(OBJETIVO_FI.capital)}</span>
        </div>
        <div className="barra" style={{ height:10, marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, total/OBJETIVO_FI.capital*100)}%`, background:`linear-gradient(90deg,${palette.faint},${palette.acc})` }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub, marginBottom:16 }}>{formatPercent(total/OBJETIVO_FI.capital*100)} del objetivo de {formatEuro(OBJETIVO_FI.capital)} (renta de ~{formatEuro(OBJETIVO_FI.rentaMensual)}/mes, regla del 4%).</div>

        <div className="grid" style={{ gridTemplateColumns:"1fr 1fr", marginBottom:14 }}>
          <label>
            <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Aportación mensual (€)</div>
            <input className="inp" type="number" step="any" value={aportacionFI} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setAportacionFI(parseFloat(event.target.value)||0)} />
          </label>
          <label>
            <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Rentabilidad anual esperada</div>
            <input className="inp" type="number" step="0.01" value={rentabilidadFI} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setRentabilidadFI(parseFloat(event.target.value)||0)} />
          </label>
        </div>
        <div style={{ fontSize:13, lineHeight:1.6, color:palette.ink }}>
          {proyeccion.meses && aniosFI != null
            ? <>A este ritmo llegarías a los {formatEuro(OBJETIVO_FI.capital)} en <strong className="num">~{aniosFI.toFixed(1)} años</strong> (hacia <strong className="num">{anioObjetivoFI}</strong>, con ~<strong className="num">{edadObjetivoFI?.toFixed(0)}</strong> años).</>
            : <>Con estos parámetros no se alcanza el objetivo en un horizonte razonable. Sube la aportación o revisa la rentabilidad esperada.</>}
        </div>
        <div style={{ fontSize:11.5, color:palette.faint, marginTop:8 }}>Estimación con interés compuesto mensual, no es una garantía. El salario, no la rentabilidad, es tu mayor palanca (regla nº8).</div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:8 }}>Vivienda</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{formatEuro(invertido)}</span>
          <span className="num" style={{ color:palette.faint }}>/ {formatEuro(OBJETIVO_VIVIENDA.masaCritica)}</span>
        </div>
        <div className="barra" style={{ marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, invertido/OBJETIVO_VIVIENDA.masaCritica*100)}%`, background:palette.acc }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub, lineHeight:1.6 }}>
          Masa crítica invertida objetivo para usar la cartera como <strong style={{color:palette.ink}}>garantía</strong> (no pignoración) de una hipoteca al 100%. Horizonte {OBJETIVO_VIVIENDA.horizonte}, sin presión de plazo. Dinero a &lt;5 años nunca va a renta variable.
        </div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:8 }}>Fondo de emergencia</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{formatEuro(liquidezTotal)}</span>
          <span className="num" style={{ color:palette.faint }}>/ {formatEuro(OBJETIVOS.fondoEmergencia)}</span>
        </div>
        <div className="barra" style={{ marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, liquidezTotal/OBJETIVOS.fondoEmergencia*100)}%`, background: condFondo ? palette.acc : palette.bad }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub }}>
          {condFondo ? "Mínimo intocable cubierto." : `Por debajo del mínimo de ${formatEuro(OBJETIVOS.fondoMinimo)}: es la prioridad.`} Objetivo 6 meses de gastos (4.900€).
        </div>
      </div>

      <div className="card span-2">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
          <div className="eyebrow">Deudas y patrimonio neto</div>
          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:palette.sub }}>
            <input type="checkbox" checked={contarCoche} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setContarCoche(event.target.checked)} />
            Contar el coche como activo (neutraliza su deuda)
          </label>
        </div>
        {deudas.map(d => (
          <div key={d.id} className="deuda-row" style={{ marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${palette.line}` }}>
            <div>
              <div style={{ fontSize:13, color:palette.ink }}>{d.nombre}</div>
              <div style={{ fontSize:11, color: d.limite ? palette.warn : palette.faint, marginTop:2 }}>{d.nota}</div>
            </div>
            <label>
              <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Cuota/mes</div>
              <input className="inp" type="number" step="any" value={d.cuota} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarDeuda(d.id,"cuota",event.target.value)} />
            </label>
            <label>
              <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Saldo pendiente</div>
              <input className="inp" type="number" step="any" value={d.saldo} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarDeuda(d.id,"saldo",event.target.value)} />
            </label>
            <button className="seg" onClick={()=>marcarLiquidada(d.id)} title="Marcar como liquidada">Liquidar</button>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginTop:14 }}>
          <Metric label="Deuda total" value={formatEuro(deudaTotal)} sub="suma de saldos pendientes" />
          <Metric label="Patrimonio neto" value={formatEuro(patrimonioNeto)} sub={contarCoche ? "coche neutralizado" : "coche cuenta como deuda"} />
        </div>
      </div>

      <div className="card span-full">
        <div className="eyebrow" style={{ marginBottom:16 }}>Fases del plan (desbloqueadas por salario)</div>
        <label style={{ display:"block", marginBottom:18, maxWidth:220 }}>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Salario bruto anual actual</div>
          <input className="inp" type="number" step="1000" value={salarioActual} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setSalarioActual(parseFloat(event.target.value)||0)} />
        </label>
        <div className="roadmap">
          {FASES.map(f => {
            const estado = f.id < faseActual.id ? "done" : f.id === faseActual.id ? "now" : "";
            return (
              <div key={f.id} className={`roadstep ${estado}`}>
                <div className="eyebrow" style={{ color: estado==="now" ? palette.acc : palette.faint, marginBottom:6 }}>Fase {f.id} · {f.edad} años</div>
                <div style={{ fontSize:13.5, fontWeight:600, color: estado ? palette.ink : palette.sub, marginBottom:6 }}>{f.nombre}</div>
                <div style={{ fontSize:11.5, color:palette.sub, lineHeight:1.5, marginBottom:8 }}>{f.desc}</div>
                <div style={{ fontSize:11, color:palette.faint }}>{f.salarioMin>0 && `Trigger: salario >${(f.salarioMin/1000).toFixed(0)}K`}{f.carteraMin>0 && ` · cartera >${(f.carteraMin/1000).toFixed(0)}K`}</div>
              </div>
            );
          })}
        </div>
        {faseSiguiente && (
          <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${palette.line}`, fontSize:12.5, color:palette.sub }}>
            Para desbloquear <strong style={{color:palette.ink}}>Fase {faseSiguiente.id}</strong> necesitas salario &gt;{formatEuro(faseSiguiente.salarioMin)}{faseSiguiente.carteraMin>0 && ` y cartera >${formatEuro(faseSiguiente.carteraMin)}`}.
          </div>
        )}
      </div>

      <div className="card span-2">
        <div className="eyebrow" style={{ marginBottom:8 }}>Operación Bitcoin (bear market)</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{formatEuro(huchaBTC)}</span>
          </label>
          <span className="num" style={{ color:palette.faint }}>/ {formatEuro(OBJETIVO_BTC_OP.objetivo)}</span>
        </div>
        <input className="inp" type="number" step="any" value={huchaBTC} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setHuchaBTC(parseFloat(event.target.value)||0)} style={{ maxWidth:160, marginBottom:12 }} />
        <div className="barra" style={{ marginBottom:12 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, huchaBTC/OBJETIVO_BTC_OP.objetivo*100)}%`, background:palette.acc }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub, marginBottom:14 }}>Hucha para 2 tramos en nov–dic 2026 (financiada con AW liberado + Kindle liberado + ~50€/mes caprichos, ventana {OBJETIVO_BTC_OP.ventana}).</div>
        <div className="eyebrow" style={{ marginBottom:8 }}>3 condiciones inamovibles</div>
        <label style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, fontSize:12.5, color: condFondo?palette.sub:palette.bad }}>
          <input type="checkbox" checked={condFondo} disabled readOnly /> Fondo de emergencia &gt;1.000€ intacto
        </label>
        <label style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, fontSize:12.5, color:palette.sub }}>
          <input type="checkbox" checked={condicionesBTC.prescindible} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setCondicionesBTC(c=>({...c,prescindible:event.target.checked}))} /> Dinero prescindible (no del fondo)
        </label>
        <label style={{ display:"flex", gap:8, alignItems:"center", fontSize:12.5, color:palette.sub }}>
          <input type="checkbox" checked={condicionesBTC.dcaActivo} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setCondicionesBTC(c=>({...c,dcaActivo:event.target.checked}))} /> El DCA mensual no se pausa
        </label>
      </div>
    </div>
  );
}

