"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";

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

type TipoPosicion = "fondo" | "etf" | "cripto" | "efectivo";
type GrupoPosicion = "rv" | "btc" | "liquidez";

interface Posicion {
  id: string;
  nombre: string;
  ticker: string;
  tipo: TipoPosicion;
  participaciones: number;
  precio: number;
  grupo: GrupoPosicion;
}

interface PosicionConValor extends Posicion {
  color: string;
  valor: number;
}

interface PuntoHistorico {
  mes: string;
  total: number;
}

interface Deuda {
  id: string;
  nombre: string;
  cuota: number;
  saldo: number;
  nota: string;
  limite?: string;
}

type CategoriaId = "gastosFijos" | "inversion" | "fondoEmergencia" | "ocio" | "caprichos";
type TipoCategoria = "gasto" | "ahorro";

interface Categoria {
  id: CategoriaId;
  nombre: string;
  tipo: TipoCategoria;
}

interface GastoFijoItem {
  id: string;
  nombre: string;
  importe: number;
}

type CategoriaEvento = CategoriaId | "ingreso";

interface Evento {
  id: string;
  nombre: string;
  importe: number;
  categoria: CategoriaEvento;
}

interface Mes {
  id: string;
  fecha: Date;
  mes: string;
  overrides: Partial<Record<CategoriaId, number>>;
  eventos: Evento[];
  real: Partial<Record<CategoriaId, number | null>>;
  ingresoNetoOverride: number | null;
}

interface PresupuestoBase {
  ingresoNeto: number;
  gastosFijos: number;
  inversion: number;
  fondoEmergencia: number;
  ocio: number;
  caprichos: number;
}

interface PresupuestoBaseBorrador extends PresupuestoBase {
  gastosFijosItems: GastoFijoItem[];
}

interface Fase {
  id: number;
  nombre: string;
  edad: string;
  salarioMin: number;
  carteraMin: number;
  desc: string;
}

interface CondicionesBTC {
  prescindible: boolean;
  dcaActivo: boolean;
}

interface CompItem {
  n: string;
  v: number;
}

interface Composicion {
  nombre: string;
  paises: CompItem[];
  sectores: CompItem[];
}

interface Alerta {
  t: "good" | "warn" | "bad";
  m: string;
}

interface CalculoMes {
  valores: Record<CategoriaId, number>;
  ingreso: number;
  totalPresupuestado: number;
  sobrante: number;
  real: Record<CategoriaId, number | null>;
  totalReal: number;
}

interface CarteraDerivada {
  conValor: PosicionConValor[];
  total: number;
  invertido: number;
  liquidezTotal: number;
  rvItems: PosicionConValor[];
  rv: number;
  btcTotal: number;
  btcPesoTotal: number;
  pesoRVde: (id: string) => number;
  pieCartera: { name: string; value: number; color: string }[];
}

interface ProyeccionFIParams {
  inicial: number;
  aportacion: number;
  rentabilidadAnual: number;
  objetivo: number;
  maxMeses?: number;
}

interface ProyeccionFIResultado {
  meses: number | null;
  capitalFinal: number;
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

interface MetricProps {
  label: string;
  value: string;
  sub: string;
}

const C = {
  bg:"#0f1417", panel:"#161d22", panel2:"#1c252b", line:"#2a363d",
  ink:"#e8eef0", sub:"#8fa3ad", faint:"#5d6f78",
  acc:"#4db6a4", warn:"#d8a657", bad:"#cf6b00",
};
const SERIES = ["#4db6a4","#5b8fb0","#c98a5e","#d8a657","#6b7d86","#a87f9e","#7e9c8a","#8a9ba3","#b0654f","#3d6f63"];
const colorDe = (i: number): string => SERIES[i % SERIES.length];

const eur = (n: number): string => (n||0).toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const eur2 = (n: number): string => (n||0).toLocaleString("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2});
const pct = (n: number): string => `${(n||0).toFixed(1)}%`;
const uid = (): string => Math.random().toString(36).slice(2, 9);

// --------- CARTERA INICIAL (edítala desde la propia interfaz) ----------------
// tipo: "fondo" | "etf" | "cripto" | "efectivo"
// Para "efectivo": participaciones = saldo en €, precio = 1, sin ticker.
const CARTERA_INICIAL: Posicion[] = [
  { id: "world",    nombre: "Fidelity MSCI World",       ticker: "0P0000KSPA.F", tipo: "fondo",    participaciones: 30.12,    precio: 18.72,   grupo: "rv" },
  { id: "em",       nombre: "Fidelity Emerging Markets", ticker: "0P0000KSP9.F", tipo: "fondo",    participaciones: 11.85,    precio: 12.86,   grupo: "rv" },
  { id: "nasdaq",   nombre: "iShares Nasdaq 100",        ticker: "CNDX.L",       tipo: "etf",      participaciones: 0.142,    precio: 1024.86, grupo: "rv" },
  { id: "btc",      nombre: "Bitcoin",                   ticker: "BTC-EUR",      tipo: "cripto",   participaciones: 0.003441, precio: 60848.0, grupo: "btc" },
  { id: "liquidez", nombre: "Fondo emergencia / casa",   ticker: "",             tipo: "efectivo", participaciones: 489.93,   precio: 1,       grupo: "liquidez" },
];

const OBJETIVOS = {
  fondoEmergencia: 4900, fondoMinimo: 1000,
  pesoRV: { world: 60, em: 20, nasdaq: 20 },
  btcPausar: 40, btcVender: 50, btcUmbralPausar: 10000, btcUmbralVender: 20000,
};

// Composición de índices (orientativa, jun 2026). Clave = id de la posición.
const COMPOSICION: Record<string, Composicion> = {
  world: { nombre: "Fidelity MSCI World",
    paises: [{n:"EE.UU.",v:71},{n:"Japón",v:6},{n:"Reino Unido",v:4},{n:"Canadá",v:3},{n:"Francia",v:3},{n:"Suiza",v:3},{n:"Alemania",v:2},{n:"Otros",v:8}],
    sectores: [{n:"Tecnología",v:26},{n:"Financiero",v:16},{n:"Salud",v:11},{n:"Consumo discr.",v:11},{n:"Industria",v:11},{n:"Comunicación",v:8},{n:"Consumo básico",v:6},{n:"Otros",v:11}] },
  em: { nombre: "Fidelity Emerging Markets",
    paises: [{n:"China",v:27},{n:"India",v:20},{n:"Taiwán",v:19},{n:"Corea",v:11},{n:"Brasil",v:5},{n:"Arabia Saudí",v:4},{n:"Otros",v:14}],
    sectores: [{n:"Tecnología",v:24},{n:"Financiero",v:22},{n:"Consumo discr.",v:13},{n:"Comunicación",v:10},{n:"Materiales",v:7},{n:"Industria",v:6},{n:"Otros",v:18}] },
  nasdaq: { nombre: "iShares Nasdaq 100",
    paises: [{n:"EE.UU.",v:97},{n:"Otros",v:3}],
    sectores: [{n:"Tecnología",v:50},{n:"Comunicación",v:16},{n:"Consumo discr.",v:13},{n:"Salud",v:6},{n:"Consumo básico",v:6},{n:"Industria",v:5},{n:"Otros",v:4}] },
};

const HISTORICO_INICIAL: PuntoHistorico[] = [
  { mes: "Feb 26", total: 618 }, { mes: "Mar 26", total: 1046 },
  { mes: "Abr 26", total: 1300 }, { mes: "May 26", total: 1450 }, { mes: "Jun 26", total: 1561 },
];

// --------- DEUDAS INICIALES (edítalas desde la pestaña Metas) ---------------
const DEUDAS_INICIAL: Deuda[] = [
  { id: "coche",      nombre: "Coche (financiación)",              cuota: 173.28, saldo: 8000, nota: "En curso, sin fecha de fin fija" },
  { id: "applewatch", nombre: "Apple Watch (revolving 24% TAE)",   cuota: 75,     saldo: 105,  nota: "Liquidar antes del 10 de julio 2026", limite: "2026-07-10" },
  { id: "kindle",     nombre: "Kindle",                            cuota: 44,     saldo: 132,  nota: "Liquida en septiembre 2026" },
  { id: "ledger",     nombre: "Ledger Nano X (3 plazos)",          cuota: 39.53,  saldo: 79.06, nota: "Financiada jul–ago–sep 2026" },
];

// --------- METAS ---------------------------------------------------------
const OBJETIVO_FI = { capital: 750000, edadActual: 28, edadObjetivo: 50, rentaMensual: 2250 };
const OBJETIVO_VIVIENDA = { masaCritica: 50000, horizonte: "5–10 años" };
const OBJETIVO_BTC_OP = { objetivo: 630, ventana: "sep–dic 2026" };

const FASES: Fase[] = [
  { id: 1, nombre: "Acumulación + Operación BTC", edad: "28–31", salarioMin: 0,     carteraMin: 0,      desc: "DCA 200€ fondos + 25€ BTC. Modo estanflación activo. Operación bear market ~630€. Cold wallet." },
  { id: 2, nombre: "Escalada + Japón en radar",    edad: "31–35", salarioMin: 35000, carteraMin: 0,      desc: "Aumentar aportaciones (regla 50/50). Evaluar Japón (Fidelity MSCI Japan) y oro adelantado." },
  { id: 3, nombre: "Small Caps + Renta Fija",      edad: "35–40", salarioMin: 50000, carteraMin: 100000, desc: "Vanguard Global Small-Cap 10%. Inicio renta fija. Posible estrategia vivienda con garantía." },
  { id: 4, nombre: "Consolidación + Oro",          edad: "40–45", salarioMin: 65000, carteraMin: 200000, desc: "Oro 5–10% (ETC físico). Renta fija 15–20%. Private Equity (máx 5%) si cartera >300K." },
  { id: 5, nombre: "Protección pre-retiro",        edad: "45–50", salarioMin: 65000, carteraMin: 400000, desc: "RV 65–70% / RF 20–25% / Oro 5–10%. Bitcoin: venta parcial si >30% del patrimonio." },
];

// --------- PRESUPUESTO ------------------------------------------------------
const PRESUPUESTO_BASE_INICIAL: PresupuestoBase = {
  ingresoNeto: 1766,
  gastosFijos: 778.89,
  inversion: 293,
  fondoEmergencia: 325,
  ocio: 270,
  caprichos: 100,
};

const CATEGORIAS: Categoria[] = [
  { id: "gastosFijos",     nombre: "Gastos fijos",              tipo: "gasto"  },
  { id: "inversion",       nombre: "Inversión",                 tipo: "ahorro" },
  { id: "fondoEmergencia", nombre: "Fondo emergencia / casa",   tipo: "ahorro" },
  { id: "ocio",            nombre: "Ocio",                      tipo: "gasto"  },
  { id: "caprichos",       nombre: "Caprichos / tech",          tipo: "gasto"  },
];

const CATEGORIA_LABEL: Partial<Record<CategoriaEvento, string>> = Object.fromEntries(
  CATEGORIAS.map((categoria): [CategoriaId, string] => [categoria.id, categoria.nombre]),
);

// Desglose editable de "Gastos fijos": la suma de estas líneas alimenta presupuestoBase.gastosFijos.
const GASTOS_FIJOS_INICIAL: GastoFijoItem[] = [
  { id: uid(), nombre: "Coche (financiación)", importe: 173.28 },
  { id: uid(), nombre: "Suministros, seguros, suscripciones y otros fijos", importe: 605.61 },
];

const nuevoMes = (
  anio: number,
  mesIndex: number,
  overrides: Partial<Record<CategoriaId, number>> = {},
  eventos: Evento[] = [],
): Mes => ({
  id: uid(),
  fecha: new Date(anio, mesIndex, 1),
  mes: new Date(anio, mesIndex, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).replace(".", ""),
  overrides, eventos, real: {}, ingresoNetoOverride: null,
});

const MESES_INICIAL: Mes[] = [
  nuevoMes(2026, 6, { inversion: 225, fondoEmergencia: 203 }, [{ id: uid(), nombre: "Liquidar Apple Watch + Kindle + Ledger 1/3", importe: 188.53, categoria: "gastosFijos" }]),
  nuevoMes(2026, 7, { inversion: 225, fondoEmergencia: 309 }, [{ id: uid(), nombre: "Kindle + Ledger 2/3", importe: 83.05, categoria: "gastosFijos" }]),
  nuevoMes(2026, 8, { inversion: 225, fondoEmergencia: 137 }, [{ id: uid(), nombre: "Liquidar Kindle + Ledger 3/3", importe: 129.28, categoria: "gastosFijos" }]),
  nuevoMes(2026, 9, { inversion: 293, fondoEmergencia: 199 }),
  nuevoMes(2026, 10, { inversion: 293, fondoEmergencia: 199 }),
  nuevoMes(2026, 11, { inversion: 293, fondoEmergencia: 199 }),
  nuevoMes(2027, 0),
  nuevoMes(2027, 1),
  nuevoMes(2027, 2),
  nuevoMes(2027, 3),
  nuevoMes(2027, 4),
  nuevoMes(2027, 5),
];

const claveMes = (d: Date): number => d.getFullYear() * 12 + d.getMonth();
const esMesDisponible = (fecha: Date): boolean => claveMes(fecha) <= claveMes(new Date());

/* >>> BACKEND <<<  Precio por ticker desde TU servidor (Yahoo, evita CORS).
   Debe devolver un número (€/participación) para el ticker dado. */
async function fetchYahooPrice(_ticker: string): Promise<number> {
  // const r = await fetch("/api/precio?ticker=" + encodeURIComponent(ticker));
  // const { price } = await r.json();
  // return price;
  throw new Error("Conecta tu backend en fetchYahooPrice()");
}

function derivarCartera(cartera: Posicion[]): CarteraDerivada {
  const conValor: PosicionConValor[] = cartera.map((p, i) => ({
    ...p, color: colorDe(i),
    valor: p.tipo === "efectivo" ? (p.participaciones || 0) : (p.participaciones || 0) * (p.precio || 0),
  }));
  const total = conValor.reduce((s, p) => s + p.valor, 0);
  const invertido = conValor.filter(p => p.grupo !== "liquidez").reduce((s, p) => s + p.valor, 0);
  const liquidezTotal = conValor.filter(p => p.grupo === "liquidez").reduce((s, p) => s + p.valor, 0);
  const rvItems = conValor.filter(p => p.grupo === "rv");
  const rv = rvItems.reduce((s, p) => s + p.valor, 0);
  const btcTotal = conValor.filter(p => p.grupo === "btc").reduce((s, p) => s + p.valor, 0);
  const btcPesoTotal = total ? (btcTotal / total) * 100 : 0;
  const pesoRVde = (id: string): number => { const it = rvItems.find(p => p.id === id); return rv && it ? (it.valor / rv) * 100 : 0; };
  const pieCartera = conValor.filter(p => p.valor > 0).map(p => ({ name: p.nombre, value: p.valor, color: p.color }));
  return { conValor, total, invertido, liquidezTotal, rvItems, rv, btcTotal, btcPesoTotal, pesoRVde, pieCartera };
}

function calcMes(mes: Mes, base: PresupuestoBase): CalculoMes {
  const valores = {} as Record<CategoriaId, number>;
  CATEGORIAS.forEach(c => {
    const objetivoBase = mes.overrides?.[c.id] ?? base[c.id];
    const eventosCat = (mes.eventos || []).filter(e => e.categoria === c.id).reduce((s,e)=>s+(e.importe||0),0);
    valores[c.id] = objetivoBase + eventosCat;
  });
  const ingresoEventos = (mes.eventos || []).filter(e=>e.categoria==="ingreso").reduce((s,e)=>s+(e.importe||0),0);
  const ingreso = (mes.ingresoNetoOverride ?? base.ingresoNeto) + ingresoEventos;
  const totalPresupuestado = CATEGORIAS.reduce((s,c)=>s+valores[c.id],0);
  const sobrante = ingreso - totalPresupuestado;
  const real = {} as Record<CategoriaId, number | null>;
  CATEGORIAS.forEach(c => {
    const valorReal = mes.real ? mes.real[c.id] : undefined;
    real[c.id] = valorReal != null ? valorReal : null;
  });
  const totalReal = CATEGORIAS.reduce((s,c)=> {
    const valorReal = real[c.id];
    return s + (valorReal != null ? valorReal : valores[c.id]);
  }, 0);
  return { valores, ingreso, totalPresupuestado, sobrante, real, totalReal };
}

function proyectarFI({ inicial, aportacion, rentabilidadAnual, objetivo, maxMeses = 900 }: ProyeccionFIParams): ProyeccionFIResultado {
  const rMensual = Math.pow(1 + rentabilidadAnual, 1/12) - 1;
  let capital = inicial;
  for (let mesIndex = 1; mesIndex <= maxMeses; mesIndex++) {
    capital = capital * (1 + rMensual) + aportacion;
    if (capital >= objetivo) return { meses: mesIndex, capitalFinal: capital };
  }
  return { meses: null, capitalFinal: capital };
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

  const derivada = useMemo(() => derivarCartera(cartera), [cartera]);

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: "patrimonio",  label: "Patrimonio" },
    { id: "presupuesto", label: "Presupuesto" },
    { id: "metas",       label: "Metas" },
  ];

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.ink, fontFamily:"'DM Sans',system-ui,sans-serif", padding:"clamp(16px,4vw,40px)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .grid { display:grid; gap:16px; }
        .card { background:${C.panel}; border:1px solid ${C.line}; border-radius:14px; padding:20px; }
        .eyebrow { font:500 11px/1 'DM Mono',monospace; letter-spacing:.14em; text-transform:uppercase; color:${C.faint}; }
        .num { font-family:'DM Mono',monospace; font-variant-numeric:tabular-nums; }
        .disp { font-family:'Fraunces',serif; }
        button { font-family:inherit; cursor:pointer; }
        input, select { font-family:'DM Mono',monospace; }
        .seg { background:${C.panel2}; border:1px solid ${C.line}; color:${C.sub}; padding:6px 12px; border-radius:8px; font-size:13px; transition:.15s; white-space:nowrap; }
        .seg.on { background:${C.acc}; color:#06110e; border-color:${C.acc}; font-weight:600; }
        .seg:disabled { opacity:.5; cursor:default; }
        .inp { width:100%; background:${C.panel}; border:1px solid ${C.line}; color:${C.ink}; border-radius:7px; padding:8px 10px; font-size:14px; }
        .recharts-default-tooltip { background:${C.panel2}!important; border:1px solid ${C.line}!important; border-radius:8px!important; }
        .recharts-tooltip-label { color:${C.sub}!important; font-family:'DM Mono',monospace; font-size:12px; }
        .recharts-tooltip-item, .recharts-tooltip-item-name, .recharts-tooltip-item-value { color:${C.ink}!important; font-family:'DM Mono',monospace!important; font-size:13px!important; }
        .span-full { grid-column:1/-1; } .span-2 { grid-column:span 2; }
        .compo { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:center; }
        .poscard { background:${C.bg}; border:1px solid ${C.line}; border-radius:10px; padding:14px; }
        .posrow { display:grid; grid-template-columns:1.4fr .9fr 1fr .9fr auto; gap:10px; align-items:end; }
        .barra { height:8px; background:${C.panel2}; border-radius:4px; overflow:hidden; position:relative; }
        .barra-fill { height:100%; border-radius:4px; transition:width .2s; }
        .tabnav { display:flex; gap:6px; flex-wrap:wrap; background:${C.panel2}; border:1px solid ${C.line}; border-radius:10px; padding:4px; }
        .tabbtn { background:transparent; border:none; color:${C.sub}; padding:9px 18px; border-radius:7px; font-size:13.5px; font-weight:500; transition:.15s; white-space:nowrap; }
        .tabbtn.on { background:${C.acc}; color:#06110e; font-weight:700; }
        .roadmap { display:flex; gap:0; align-items:stretch; }
        .roadstep { flex:1; padding:14px 12px; border-top:3px solid ${C.line}; position:relative; }
        .roadstep.done { border-top-color:${C.acc}; }
        .roadstep.now { border-top-color:${C.acc}; }
        .roadstep.now::before { content:""; position:absolute; top:-6px; left:0; width:100%; height:3px; background:${C.acc}; box-shadow:0 0 8px ${C.acc}; }
        .gf-row { display:grid; grid-template-columns:1fr 140px auto; gap:8px; align-items:center; }
        .evt-row { display:grid; grid-template-columns:1.5fr .8fr 1fr auto; gap:8px; }
        .deuda-row { display:grid; grid-template-columns:1.6fr .8fr .8fr auto; gap:10px; align-items:end; }
        @media (max-width:900px){ .span-2 { grid-column:1/-1; } .compo { grid-template-columns:1fr; } .roadmap { flex-direction:column; } .roadstep { border-top:none; border-left:3px solid ${C.line}; padding-left:16px; } .roadstep.now, .roadstep.done { border-left-color:${C.acc}; } }
        @media (max-width:760px){ .hide-sm { display:none; } .card { padding:16px; } .posrow { grid-template-columns:1fr 1fr; } }
        @media (max-width:640px){ .gf-row, .evt-row, .deuda-row { grid-template-columns:1fr 1fr; } .deuda-row > div:first-child { grid-column:1/-1; } }
        @media (max-width:420px){ .gf-row, .evt-row, .deuda-row { grid-template-columns:1fr; } .tabbtn { padding:8px 12px; font-size:12.5px; } }
      `}</style>

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

      <footer style={{ marginTop:24, paddingTop:16, borderTop:`1px solid ${C.line}`, fontSize:11.5, color:C.faint, lineHeight:1.6 }}>
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
      a.push({ t:"warn", m:`Fondo de emergencia por debajo del mínimo de ${eur(OBJETIVOS.fondoMinimo)}. Es la prioridad.` });
    if (btcPesoTotal > OBJETIVOS.btcVender && total > OBJETIVOS.btcUmbralVender)
      a.push({ t:"bad", m:`BTC supera el 50% con cartera >20k: toca venta parcial hasta el 30%.` });
    else if (btcPesoTotal > OBJETIVOS.btcPausar && total > OBJETIVOS.btcUmbralPausar)
      a.push({ t:"warn", m:`BTC supera el 40% con cartera >10k: pausar aportaciones de BTC.` });
    const desvW = Math.abs(pesoRVde("world") - OBJETIVOS.pesoRV.world);
    if (rv && desvW > 8) a.push({ t:"warn", m:`World desviado ${desvW.toFixed(0)} pts del objetivo 60%. El DCA lo corrige.` });
    if (liquidezTotal >= OBJETIVOS.fondoEmergencia)
      a.push({ t:"good", m:`Fondo de emergencia completo (${eur(OBJETIVOS.fondoEmergencia)}). Replantea virar a inversión.` });
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
    id: uid(), nombre: tipo === "efectivo" ? "Nuevo efectivo" : "Nueva posición",
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

  const scoreColor = score.total >= 8 ? C.acc : score.total >= 6 ? C.warn : C.bad;
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
          <div className="num disp" style={{ fontSize:"clamp(40px,9vw,68px)", fontWeight:600, lineHeight:1 }}>{eur2(total)}</div>
          <div style={{ marginTop:10, fontSize:15 }} className="num">
            <span style={{ color: variacion>=0 ? C.acc : C.bad }}>{variacion>=0?"▲":"▼"} {eur2(Math.abs(variacion))} ({variacionPct>=0?"+":""}{variacionPct.toFixed(2)}%)</span>
            <span style={{ color:C.faint }}> desde el último mes registrado</span>
          </div>
          <div style={{ marginTop:6, fontSize:12.5 }} className="num">
            <span style={{ color:C.sub }}>Patrimonio neto (activos − deudas): </span>
            <span style={{ color: patrimonioNeto>=0?C.acc:C.bad, fontWeight:600 }}>{eur2(patrimonioNeto)}</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
          <Metric label="Invertido" value={eur(invertido)} sub={`${pct(total?invertido/total*100:0)} del total`} />
          <Metric label="Liquidez" value={eur(liquidezTotal)} sub={`${pct(total?liquidezTotal/total*100:0)} del total`} />
          <Metric label="Bitcoin" value={eur(btcTotal)} sub={`${pct(btcPesoTotal)} del total`} />
        </div>
      </div>

      {editando && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="eyebrow" style={{ marginBottom:6 }}>Editar cartera</div>
          <p style={{ margin:"0 0 16px", fontSize:12.5, color:C.sub, lineHeight:1.5 }}>
            Cada posición: <strong style={{color:C.ink}}>nombre, ticker de Yahoo y participaciones</strong>. El precio lo trae Yahoo por su ticker (botón ↻).
            En efectivo introduces el saldo en €. Añade, edita o borra posiciones cuando rebalancees.
          </p>
          <div className="grid">
            {cartera.map((p) => (
              <div key={p.id} className="poscard">
                <div className="posrow">
                  <label>
                    <div style={{ fontSize:11, color:C.sub, marginBottom:3 }}>Nombre</div>
                    <input className="inp" value={p.nombre} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editar(p.id,"nombre",event.target.value)} style={{fontFamily:"'DM Sans',sans-serif"}} />
                  </label>
                  <label>
                    <div style={{ fontSize:11, color:C.sub, marginBottom:3 }}>Tipo</div>
                    <select className="inp" value={p.tipo} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => editar(p.id,"tipo",event.target.value)}>
                      {tiposDisponibles.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                    </select>
                  </label>
                  {p.tipo === "efectivo" ? (
                    <label style={{ gridColumn:"span 2" }}>
                      <div style={{ fontSize:11, color:C.sub, marginBottom:3 }}>Saldo €</div>
                      <input className="inp" type="number" step="any" value={p.participaciones} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editar(p.id,"participaciones",event.target.value)} />
                    </label>
                  ) : (
                    <>
                      <label>
                        <div style={{ fontSize:11, color:C.sub, marginBottom:3 }}>Ticker Yahoo</div>
                        <input className="inp" value={p.ticker} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editar(p.id,"ticker",event.target.value)} placeholder="ej. CNDX.L" />
                      </label>
                      <label>
                        <div style={{ fontSize:11, color:C.sub, marginBottom:3 }}>{p.tipo==="cripto"?"Cantidad":"Particip."}</div>
                        <input className="inp" type="number" step="any" value={p.participaciones} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editar(p.id,"participaciones",event.target.value)} />
                      </label>
                    </>
                  )}
                  <button className="seg" onClick={() => borrar(p.id)} title="Borrar posición" style={{ color:C.bad, height:38 }}>✕</button>
                </div>
                {p.tipo !== "efectivo" && (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:10, paddingTop:10, borderTop:`1px solid ${C.line}`, flexWrap:"wrap", gap:8 }}>
                    <label style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:C.faint }}>Precio (Yahoo / manual)</span>
                      <input className="inp" type="number" step="any" value={p.precio} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editar(p.id,"precio",event.target.value)} style={{ width:120 }} />
                    </label>
                    <span className="num" style={{ fontSize:15, fontWeight:600, color:C.acc }}>= {eur2((p.participaciones||0)*(p.precio||0))}</span>
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
            <span className="num" style={{ fontSize:20, color:C.faint }}>/ 10</span>
          </div>
          {score.detalle.map(([n,v]) => (
            <div key={n} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:4 }}>
                <span style={{ color:C.sub }}>{n}</span><span className="num" style={{ color:C.ink }}>{v.toFixed(1)}</span>
              </div>
              <div className="barra"><div className="barra-fill" style={{ width:`${v*10}%`, background: v>=8?C.acc:v>=6?C.warn:C.bad }} /></div>
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
              <Tooltip formatter={(value) => eur2(Number(value))} itemStyle={{color:C.ink}} labelStyle={{color:C.sub}} contentStyle={{background:C.panel2,border:`1px solid ${C.line}`,borderRadius:8,color:C.ink}} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginTop:8 }}>
            {pieCartera.map((e) => (
              <span key={e.name} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.sub }}>
                <span style={{ width:9, height:9, borderRadius:2, background:e.color }} />
                {e.name} <span className="num" style={{ color:C.ink }}>{pct(total?e.value/total*100:0)}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom:16 }}>Estado del plan</div>
          {alertas.map((a,alertaIndex) => (
            <div key={alertaIndex} style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
              <span style={{ marginTop:2, width:8, height:8, borderRadius:"50%", flexShrink:0, background: a.t==="good"?C.acc:a.t==="warn"?C.warn:C.bad }} />
              <span style={{ fontSize:13, lineHeight:1.5, color: a.t==="good"?C.sub:C.ink }}>{a.m}</span>
            </div>
          ))}
          <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.line}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, color:C.sub, marginBottom:6 }}>
              <span>Reglas BTC (por peso)</span><span className="num">{pct(btcPesoTotal)} actual</span>
            </div>
            <div style={{ fontSize:11.5, color:C.faint, lineHeight:1.6 }}>Pausar si &gt;40% y cartera &gt;10k · Vender si &gt;50% y cartera &gt;20k</div>
          </div>
        </div>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom:16 }}>Renta variable · real vs objetivo {estanflacion && <span style={{color:C.warn}}>· estanflación</span>}</div>
          {filasRV.map(([k,label,obj]) => {
            const existe = cartera.some(p => p.id === k);
            const peso = pesoRVde(k);
            return (
              <div key={k} style={{ marginBottom:16, opacity: existe?1:.4 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5 }}>
                  <span style={{ color:C.ink }}>{label}</span>
                  <span className="num"><span style={{color:C.ink}}>{pct(peso)}</span> <span style={{color:C.faint}}>/ {obj}%</span></span>
                </div>
                <div style={{ position:"relative", height:7, background:C.panel2, borderRadius:4 }}>
                  <div style={{ position:"absolute", left:`${obj}%`, top:-2, bottom:-2, width:2, background:C.faint, opacity:.7 }} />
                  <div style={{ height:"100%", width:`${Math.min(100,peso)}%`, background:C.acc, borderRadius:4 }} />
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
              <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="mes" stroke={C.faint} tick={{ fontSize:12, fontFamily:"DM Mono" }} />
              <YAxis stroke={C.faint} tick={{ fontSize:12, fontFamily:"DM Mono" }} tickFormatter={(value)=>`${(Number(value)/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value)=>eur2(Number(value))} cursor={{ stroke: C.faint, strokeWidth: 1 }} itemStyle={{color:C.ink}} contentStyle={{background:C.panel2,border:`1px solid ${C.line}`,borderRadius:8}} labelStyle={{color:C.sub}} />
              <Line type="monotone" dataKey="total" stroke={C.acc} strokeWidth={2.5} dot={{ r:3, fill:C.acc }} activeDot={{ r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom:14 }}>Fondo de emergencia / casa</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:4 }}>
            <span className="num disp" style={{ fontSize:34, fontWeight:600 }}>{eur(liquidezTotal)}</span>
            <span className="num" style={{ color:C.faint }}>/ {eur(OBJETIVOS.fondoEmergencia)}</span>
          </div>
          <div style={{ height:10, background:C.panel2, borderRadius:6, overflow:"hidden", margin:"14px 0 10px", position:"relative" }}>
            <div style={{ position:"absolute", left:`${OBJETIVOS.fondoMinimo/OBJETIVOS.fondoEmergencia*100}%`, top:0, bottom:0, width:2, background:C.ink, opacity:.5, zIndex:2 }} />
            <div style={{ height:"100%", width:`${Math.min(100,liquidezTotal/OBJETIVOS.fondoEmergencia*100)}%`, background:`linear-gradient(90deg,${C.faint},${C.acc})`, borderRadius:6 }} />
          </div>
          <div style={{ fontSize:12, color:C.sub }}>
            {liquidezTotal < OBJETIVOS.fondoMinimo
              ? `Faltan ${eur(OBJETIVOS.fondoMinimo-liquidezTotal)} para el mínimo intocable.`
              : `${pct(liquidezTotal/OBJETIVOS.fondoEmergencia*100)} del objetivo. Cubre ~${(liquidezTotal/778.89).toFixed(1)} meses de gastos.`}
          </div>
        </div>

        {compKeys.length > 0 && (
          <div className="card span-2" style={{ minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:16 }}>
              <div className="eyebrow">Qué hay dentro de cada fondo</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {compKeys.map(k => <button key={k} className={`seg ${drillActivo===k?"on":""}`} onClick={()=>setDrilldown(k)}>{COMPOSICION[k].nombre.split(" ").slice(-1)[0]}</button>)}
                <span style={{ width:1, background:C.line, margin:"0 4px" }} />
                {([["paises","Países"],["sectores","Sectores"]] as Array<[VistaComposicion, string]>).map(([k,l]) => <button key={k} className={`seg ${vista===k?"on":""}`} onClick={()=>setVista(k)}>{l}</button>)}
              </div>
            </div>
            <div className="compo">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={compData} layout="vertical" margin={{ left:0, right:16 }}>
                  <XAxis type="number" hide domain={[0,"dataMax"]} />
                  <YAxis type="category" dataKey="n" width={88} stroke={C.faint} tick={{ fontSize:11.5 }} />
                  <Tooltip formatter={(value)=>`${value}%`} itemStyle={{color:C.ink}} contentStyle={{background:C.panel2,border:`1px solid ${C.line}`,borderRadius:8}} cursor={{fill:C.panel2}} />
                  <Bar dataKey="v" radius={[0,4,4,0]}>{compData.map((_entry,barIndex)=><Cell key={barIndex} fill={colorDe(barIndex)} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="hide-sm">
                <div style={{ fontSize:13, color:C.sub, lineHeight:1.7 }}>
                  <strong style={{ color:C.ink }}>{comp?.nombre}</strong><br/>
                  {vista==="paises"
                    ? `Exposición geográfica. ${compData[0]?.n} pesa ${compData[0]?.v}%: tu mayor concentración vía este fondo.`
                    : `Reparto sectorial. Tecnología pesa ${comp?.sectores.find(s=>s.n==="Tecnología")?.v ?? 0}% aquí.`}
                  <br/><br/><span style={{ color:C.faint, fontSize:12 }}>Composición orientativa (jun 2026), se actualiza despacio.</span>
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
    setBaseBorrador(b => ({ ...b, gastosFijosItems: [...b.gastosFijosItems, { id: uid(), nombre: nuevoGastoFijo.nombre, importe: parseFloat(nuevoGastoFijo.importe) || 0 }] }));
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
  const calculo = useMemo(() => calcMes(mes, presupuestoBase), [mes, presupuestoBase]);

  // --------- Borrador editable del desglose: no toca "meses" hasta pulsar Guardar ---------
  const [borrador, setBorrador] = useState<BorradorDesglose>({ ingresoNetoOverride: mes.ingresoNetoOverride, overrides: mes.overrides, real: mes.real });
  const [mesIdSincronizado, setMesIdSincronizado] = useState<string>(mes.id);
  if (mes.id !== mesIdSincronizado) {
    setMesIdSincronizado(mes.id);
    setBorrador({ ingresoNetoOverride: mes.ingresoNetoOverride, overrides: mes.overrides, real: mes.real });
    setGuardadoOk(false);
  }

  const calculoBorrador = useMemo(() => calcMes({ ...mes, ingresoNetoOverride: borrador.ingresoNetoOverride, overrides: borrador.overrides, real: borrador.real }, presupuestoBase), [mes, borrador, presupuestoBase]);

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
      ...m, eventos: [...m.eventos, { id: uid(), nombre: nuevoEvento.nombre, importe: parseFloat(nuevoEvento.importe) || 0, categoria: nuevoEvento.categoria }]
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
    const cal = calcMes(m, presupuestoBase);
    const ahorroPres = cal.valores.inversion + cal.valores.fondoEmergencia;
    const gastoPres = cal.valores.gastosFijos + cal.valores.ocio + cal.valores.caprichos;
    const ahorroRegistrado = cal.real.inversion != null || cal.real.fondoEmergencia != null;
    const gastoRegistrado = cal.real.gastosFijos != null || cal.real.ocio != null || cal.real.caprichos != null;
    const ahorroReal = ahorroRegistrado ? (cal.real.inversion ?? cal.valores.inversion) + (cal.real.fondoEmergencia ?? cal.valores.fondoEmergencia) : null;
    const gastoReal = gastoRegistrado ? (cal.real.gastosFijos ?? cal.valores.gastosFijos) + (cal.real.ocio ?? cal.valores.ocio) + (cal.real.caprichos ?? cal.valores.caprichos) : null;
    return { mes: m.mes, ahorroPres, ahorroReal, gastoPres, gastoReal };
  }), [meses, presupuestoBase]);

  const datosBaseDonut = CATEGORIAS.map((c,i) => ({ name: c.nombre, value: presupuestoBase[c.id], color: colorDe(i) }));
  const sinAsignarBorrador = baseBorrador.ingresoNeto - (totalGastosFijosBorrador + baseBorrador.inversion + baseBorrador.fondoEmergencia + baseBorrador.ocio + baseBorrador.caprichos);

  return (
    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>

      <div className="card span-full">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:6 }}>
          <div className="eyebrow">Presupuesto base anual</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {baseGuardadoOk && <span style={{ fontSize:12, color:C.acc }}>Guardado ✓</span>}
            {!baseEditando && <button className="seg on" onClick={iniciarEdicionBase}>Editar presupuesto</button>}
          </div>
        </div>
        <p style={{ margin:"0 0 16px", fontSize:12.5, color:C.sub, lineHeight:1.5 }}>
          Esto es tu plantilla por defecto para cada mes del año. Cada mes concreto puede desviarse (sueldo distinto, un gasto extra, una deuda puntual) sin tocar esta base.
        </p>

        {!baseEditando ? (
          <div className="compo">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={datosBaseDonut} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={2} stroke="none">
                  {datosBaseDonut.map((e,sliceIndex) => <Cell key={sliceIndex} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(value)=>eur2(Number(value))} itemStyle={{color:C.ink}} labelStyle={{color:C.sub}} contentStyle={{background:C.panel2,border:`1px solid ${C.line}`,borderRadius:8,color:C.ink}} />
              </PieChart>
            </ResponsiveContainer>
            <div>
              <div style={{ marginBottom:14 }}>
                <div className="eyebrow" style={{ marginBottom:4 }}>Ingreso neto /mes</div>
                <div className="num disp" style={{ fontSize:28, fontWeight:600 }}>{eur2(presupuestoBase.ingresoNeto)}</div>
              </div>
              {datosBaseDonut.map(e => (
                <div key={e.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, fontSize:13 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:8, color:C.sub }}>
                    <span style={{ width:9, height:9, borderRadius:2, background:e.color }} />
                    {e.name}
                  </span>
                  <span className="num" style={{ color:C.ink }}>{eur2(e.value)} <span style={{ color:C.faint }}>({pct(presupuestoBase.ingresoNeto ? e.value/presupuestoBase.ingresoNeto*100 : 0)})</span></span>
                </div>
              ))}
              <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.line}`, fontSize:12.5 }} className="num">
                <span style={{ color:C.sub }}>Sin asignar: </span>
                <span style={{ color: Math.abs(sinAsignarBase) < 5 ? C.acc : C.warn, fontWeight:600 }}>{eur2(sinAsignarBase)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))" }}>
              <label>
                <div style={{ fontSize:11, color:C.sub, marginBottom:3 }}>Ingreso neto /mes</div>
                <input className="inp" type="number" step="any" value={baseBorrador.ingresoNeto} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarBaseBorrador("ingresoNeto",event.target.value)} />
              </label>
              {CATEGORIAS.filter(c => c.id !== "gastosFijos").map(c => (
                <label key={c.id}>
                  <div style={{ fontSize:11, color:C.sub, marginBottom:3 }}>{c.nombre}</div>
                  <input className="inp" type="number" step="any" value={baseBorrador[c.id]} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarBaseBorrador(c.id,event.target.value)} />
                </label>
              ))}
            </div>

            <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.line}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <span style={{ fontSize:13, color:C.ink }}>Gastos fijos (desglose)</span>
                <span className="num" style={{ fontSize:16, fontWeight:600, color:C.ink }}>{eur2(totalGastosFijosBorrador)}</span>
              </div>
              {baseBorrador.gastosFijosItems.map(item => (
                <div key={item.id} className="gf-row" style={{ marginBottom:8 }}>
                  <input className="inp" value={item.nombre} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarGastoFijo(item.id,"nombre",event.target.value)} style={{fontFamily:"'DM Sans',sans-serif"}} />
                  <input className="inp" type="number" step="any" value={item.importe} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarGastoFijo(item.id,"importe",event.target.value)} />
                  <button className="seg" onClick={()=>borrarGastoFijo(item.id)} style={{ color:C.bad }}>✕</button>
                </div>
              ))}
              <div className="gf-row" style={{ marginTop:10 }}>
                <input className="inp" placeholder="Nuevo gasto fijo (ej. alquiler, seguro...)" value={nuevoGastoFijo.nombre} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setNuevoGastoFijo(n=>({...n,nombre:event.target.value}))} style={{fontFamily:"'DM Sans',sans-serif"}} />
                <input className="inp" type="number" step="any" placeholder="Importe" value={nuevoGastoFijo.importe} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setNuevoGastoFijo(n=>({...n,importe:event.target.value}))} />
                <button className="seg on" onClick={anadirGastoFijo}>+ Añadir</button>
              </div>
              <div style={{ fontSize:11.5, color:C.faint, marginTop:10 }}>El total de estas partidas es el número de &quot;Gastos fijos&quot; que se usa en toda la pestaña de Presupuesto.</div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginTop:16, paddingTop:16, borderTop:`1px solid ${C.line}` }}>
              <div className="num" style={{ fontSize:12.5 }}>
                <span style={{ color:C.sub }}>Sin asignar: </span>
                <span style={{ color: Math.abs(sinAsignarBorrador) < 5 ? C.acc : C.warn, fontWeight:600 }}>{eur2(sinAsignarBorrador)}</span>
                <span style={{ color:C.faint }}> {Math.abs(sinAsignarBorrador) < 5 ? "(cuadra con el ingreso neto)" : "(revisa: no cuadra con el ingreso neto)"}</span>
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
          <span style={{ fontSize:11.5, color:C.faint }}>Solo se muestran meses ya iniciados (previos o el actual). Los meses futuros aparecerán cuando llegue su turno.</span>
        </div>
      </div>

      <div className="card span-2">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <button className="eyebrow" onClick={()=>setDesgloseAbierto(o=>!o)} style={{ background:"none", border:"none", padding:0, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ display:"inline-block", transition:".15s", transform: desgloseAbierto?"rotate(90deg)":"rotate(0deg)" }}>▸</span>
            {mes.mes} · desglose
          </button>
          <div className="num" style={{ fontSize:12.5 }}>
            <span style={{ color:C.sub }}>Sobrante (guardado): </span>
            <span style={{ color: calculo.sobrante >= 0 ? C.acc : C.bad, fontWeight:600 }}>{eur2(calculo.sobrante)}</span>
          </div>
        </div>

        {desgloseAbierto && (
        <div style={{ marginTop:16 }}>
        <label style={{ display:"block", marginBottom:16 }}>
          <div style={{ fontSize:11, color:C.sub, marginBottom:3 }}>Ingreso neto este mes {borrador.ingresoNetoOverride==null && <span style={{color:C.faint}}>(base: {eur(presupuestoBase.ingresoNeto)})</span>}</div>
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
            <div key={c.id} style={{ marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${C.line}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6, flexWrap:"wrap", gap:6 }}>
                <span style={{ fontSize:13, color:C.ink }}>{c.nombre}</span>
                <span className="num" style={{ fontSize:12.5, color:C.faint }}>base {eur(base)}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <label>
                  <div style={{ fontSize:10.5, color:C.faint, marginBottom:2 }}>Presupuestado (override mes)</div>
                  <input className="inp" type="number" step="any" placeholder={String(base)} value={borrador.overrides?.[c.id] ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarOverrideBorrador(c.id,event.target.value)} />
                </label>
                <label>
                  <div style={{ fontSize:10.5, color:C.faint, marginBottom:2 }}>Real</div>
                  <input className="inp" type="number" step="any" placeholder="sin registrar" value={real ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarRealBorrador(c.id,event.target.value)} />
                </label>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11.5 }} className="num">
                <span style={{ color:C.sub }}>Total presupuestado: {eur2(presupuestado)}</span>
                {registrado && <span style={{ color: bien ? C.acc : C.bad }}>{delta>=0?"+":""}{eur2(delta)} vs plan</span>}
              </div>
            </div>
          );
        })}

        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
          <button className={`seg ${hayCambiosSinGuardar ? "on" : ""}`} onClick={guardarDesglose} disabled={!hayCambiosSinGuardar}>Guardar cambios</button>
          {hayCambiosSinGuardar && <button className="seg" onClick={descartarCambios}>Descartar</button>}
          {guardadoOk && <span style={{ fontSize:12, color:C.acc }}>Guardado ✓</span>}
          {!guardadoOk && hayCambiosSinGuardar && <span style={{ fontSize:12, color:C.warn }}>Cambios sin guardar</span>}
        </div>

        <div className="eyebrow" style={{ margin:"18px 0 10px" }}>Eventos / ajustes de este mes</div>
        {mes.eventos.length === 0 && <div style={{ fontSize:12.5, color:C.faint, marginBottom:10 }}>Sin ajustes puntuales este mes.</div>}
        {mes.eventos.map(ev => (
          <div key={ev.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:8, fontSize:12.5 }}>
            <span style={{ color:C.ink }}>{ev.nombre} <span style={{ color:C.faint }}>({CATEGORIA_LABEL[ev.categoria] || ev.categoria})</span></span>
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span className="num" style={{ color:C.warn }}>+{eur2(ev.importe)}</span>
              <button className="seg" onClick={()=>borrarEvento(ev.id)} style={{ color:C.bad, padding:"3px 8px" }}>✕</button>
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
            <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="nombre" stroke={C.faint} tick={{ fontSize:10.5, fontFamily:"DM Mono" }} interval={0} />
            <YAxis stroke={C.faint} tick={{ fontSize:11, fontFamily:"DM Mono" }} tickFormatter={(value)=>`${value}`} />
            <Tooltip formatter={(value)=>eur2(Number(value))} cursor={{ fill: C.panel2 }} contentStyle={{background:C.panel2,border:`1px solid ${C.line}`,borderRadius:8}} labelStyle={{color:C.sub}} itemStyle={{color:C.ink}} />
            <Legend wrapperStyle={{ fontSize:12 }} />
            <Bar dataKey="Presupuestado" fill={C.faint} radius={[4,4,0,0]} />
            <Bar dataKey="Real" fill={C.acc} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card span-full">
        <div className="eyebrow" style={{ marginBottom:6 }}>Evolución anual · ahorro vs gasto (presupuestado y real)</div>
        <p style={{ margin:"0 0 14px", fontSize:12, color:C.faint, lineHeight:1.5 }}>
          Lo &quot;real&quot; solo aparece en los meses que ya has registrado en el desglose.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={evolucionAnual} margin={{ left:-10, right:10, top:6 }}>
            <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="mes" stroke={C.faint} tick={{ fontSize:11.5, fontFamily:"DM Mono" }} />
            <YAxis stroke={C.faint} tick={{ fontSize:12, fontFamily:"DM Mono" }} />
            <Tooltip formatter={(value)=>(value==null?"sin registrar":eur2(Number(value)))} cursor={{ stroke: C.faint, strokeWidth: 1 }} contentStyle={{background:C.panel2,border:`1px solid ${C.line}`,borderRadius:8}} labelStyle={{color:C.sub}} itemStyle={{color:C.ink}} />
            <Legend wrapperStyle={{ fontSize:12 }} />
            <Line type="monotone" dataKey="ahorroPres" name="Ahorro presupuestado" stroke="#7e9c8a" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="ahorroReal" name="Ahorro real" stroke={C.acc} strokeWidth={3} dot={{ r:4 }} connectNulls={false} />
            <Line type="monotone" dataKey="gastoPres" name="Gasto presupuestado" stroke="#b0654f" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="gastoReal" name="Gasto real" stroke={C.warn} strokeWidth={3} dot={{ r:4 }} connectNulls={false} />
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

  const proyeccion = useMemo(() => proyectarFI({
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
        <div className="card span-full" style={{ borderColor: diasApplewatch<=3?C.bad:C.warn, background: diasApplewatch<=3 ? "#2a1710" : C.panel }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <span style={{ fontSize:22 }}>⚠</span>
            <div>
              <div style={{ fontSize:14, color:C.ink, fontWeight:600 }}>Liquidar Apple Watch (revolving 24% TAE)</div>
              <div style={{ fontSize:12.5, color:C.sub, marginTop:2 }}>Quedan <strong style={{color:C.ink}}>{diasApplewatch} día{diasApplewatch===1?"":"s"}</strong> antes del 10 de julio de 2026. Saldo: {eur2(deudas.find(d=>d.id==="applewatch")?.saldo || 0)}. Pasa la tarjeta a pago total y no la vuelvas a usar en revolving.</div>
            </div>
          </div>
        </div>
      )}

      <div className="card span-2">
        <div className="eyebrow" style={{ marginBottom:8 }}>Libertad financiera</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:32, fontWeight:600 }}>{eur(total)}</span>
          <span className="num" style={{ color:C.faint }}>/ {eur(OBJETIVO_FI.capital)}</span>
        </div>
        <div className="barra" style={{ height:10, marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, total/OBJETIVO_FI.capital*100)}%`, background:`linear-gradient(90deg,${C.faint},${C.acc})` }} />
        </div>
        <div style={{ fontSize:12, color:C.sub, marginBottom:16 }}>{pct(total/OBJETIVO_FI.capital*100)} del objetivo de {eur(OBJETIVO_FI.capital)} (renta de ~{eur(OBJETIVO_FI.rentaMensual)}/mes, regla del 4%).</div>

        <div className="grid" style={{ gridTemplateColumns:"1fr 1fr", marginBottom:14 }}>
          <label>
            <div style={{ fontSize:11, color:C.sub, marginBottom:3 }}>Aportación mensual (€)</div>
            <input className="inp" type="number" step="any" value={aportacionFI} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setAportacionFI(parseFloat(event.target.value)||0)} />
          </label>
          <label>
            <div style={{ fontSize:11, color:C.sub, marginBottom:3 }}>Rentabilidad anual esperada</div>
            <input className="inp" type="number" step="0.01" value={rentabilidadFI} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setRentabilidadFI(parseFloat(event.target.value)||0)} />
          </label>
        </div>
        <div style={{ fontSize:13, lineHeight:1.6, color:C.ink }}>
          {proyeccion.meses && aniosFI != null
            ? <>A este ritmo llegarías a los {eur(OBJETIVO_FI.capital)} en <strong className="num">~{aniosFI.toFixed(1)} años</strong> (hacia <strong className="num">{anioObjetivoFI}</strong>, con ~<strong className="num">{edadObjetivoFI?.toFixed(0)}</strong> años).</>
            : <>Con estos parámetros no se alcanza el objetivo en un horizonte razonable. Sube la aportación o revisa la rentabilidad esperada.</>}
        </div>
        <div style={{ fontSize:11.5, color:C.faint, marginTop:8 }}>Estimación con interés compuesto mensual, no es una garantía. El salario, no la rentabilidad, es tu mayor palanca (regla nº8).</div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:8 }}>Vivienda</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{eur(invertido)}</span>
          <span className="num" style={{ color:C.faint }}>/ {eur(OBJETIVO_VIVIENDA.masaCritica)}</span>
        </div>
        <div className="barra" style={{ marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, invertido/OBJETIVO_VIVIENDA.masaCritica*100)}%`, background:C.acc }} />
        </div>
        <div style={{ fontSize:12, color:C.sub, lineHeight:1.6 }}>
          Masa crítica invertida objetivo para usar la cartera como <strong style={{color:C.ink}}>garantía</strong> (no pignoración) de una hipoteca al 100%. Horizonte {OBJETIVO_VIVIENDA.horizonte}, sin presión de plazo. Dinero a &lt;5 años nunca va a renta variable.
        </div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:8 }}>Fondo de emergencia</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{eur(liquidezTotal)}</span>
          <span className="num" style={{ color:C.faint }}>/ {eur(OBJETIVOS.fondoEmergencia)}</span>
        </div>
        <div className="barra" style={{ marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, liquidezTotal/OBJETIVOS.fondoEmergencia*100)}%`, background: condFondo ? C.acc : C.bad }} />
        </div>
        <div style={{ fontSize:12, color:C.sub }}>
          {condFondo ? "Mínimo intocable cubierto." : `Por debajo del mínimo de ${eur(OBJETIVOS.fondoMinimo)}: es la prioridad.`} Objetivo 6 meses de gastos (4.900€).
        </div>
      </div>

      <div className="card span-2">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
          <div className="eyebrow">Deudas y patrimonio neto</div>
          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.sub }}>
            <input type="checkbox" checked={contarCoche} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setContarCoche(event.target.checked)} />
            Contar el coche como activo (neutraliza su deuda)
          </label>
        </div>
        {deudas.map(d => (
          <div key={d.id} className="deuda-row" style={{ marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${C.line}` }}>
            <div>
              <div style={{ fontSize:13, color:C.ink }}>{d.nombre}</div>
              <div style={{ fontSize:11, color: d.limite ? C.warn : C.faint, marginTop:2 }}>{d.nota}</div>
            </div>
            <label>
              <div style={{ fontSize:10.5, color:C.faint, marginBottom:2 }}>Cuota/mes</div>
              <input className="inp" type="number" step="any" value={d.cuota} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarDeuda(d.id,"cuota",event.target.value)} />
            </label>
            <label>
              <div style={{ fontSize:10.5, color:C.faint, marginBottom:2 }}>Saldo pendiente</div>
              <input className="inp" type="number" step="any" value={d.saldo} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editarDeuda(d.id,"saldo",event.target.value)} />
            </label>
            <button className="seg" onClick={()=>marcarLiquidada(d.id)} title="Marcar como liquidada">Liquidar</button>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginTop:14 }}>
          <Metric label="Deuda total" value={eur(deudaTotal)} sub="suma de saldos pendientes" />
          <Metric label="Patrimonio neto" value={eur(patrimonioNeto)} sub={contarCoche ? "coche neutralizado" : "coche cuenta como deuda"} />
        </div>
      </div>

      <div className="card span-full">
        <div className="eyebrow" style={{ marginBottom:16 }}>Fases del plan (desbloqueadas por salario)</div>
        <label style={{ display:"block", marginBottom:18, maxWidth:220 }}>
          <div style={{ fontSize:11, color:C.sub, marginBottom:3 }}>Salario bruto anual actual</div>
          <input className="inp" type="number" step="1000" value={salarioActual} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setSalarioActual(parseFloat(event.target.value)||0)} />
        </label>
        <div className="roadmap">
          {FASES.map(f => {
            const estado = f.id < faseActual.id ? "done" : f.id === faseActual.id ? "now" : "";
            return (
              <div key={f.id} className={`roadstep ${estado}`}>
                <div className="eyebrow" style={{ color: estado==="now" ? C.acc : C.faint, marginBottom:6 }}>Fase {f.id} · {f.edad} años</div>
                <div style={{ fontSize:13.5, fontWeight:600, color: estado ? C.ink : C.sub, marginBottom:6 }}>{f.nombre}</div>
                <div style={{ fontSize:11.5, color:C.sub, lineHeight:1.5, marginBottom:8 }}>{f.desc}</div>
                <div style={{ fontSize:11, color:C.faint }}>{f.salarioMin>0 && `Trigger: salario >${(f.salarioMin/1000).toFixed(0)}K`}{f.carteraMin>0 && ` · cartera >${(f.carteraMin/1000).toFixed(0)}K`}</div>
              </div>
            );
          })}
        </div>
        {faseSiguiente && (
          <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${C.line}`, fontSize:12.5, color:C.sub }}>
            Para desbloquear <strong style={{color:C.ink}}>Fase {faseSiguiente.id}</strong> necesitas salario &gt;{eur(faseSiguiente.salarioMin)}{faseSiguiente.carteraMin>0 && ` y cartera >${eur(faseSiguiente.carteraMin)}`}.
          </div>
        )}
      </div>

      <div className="card span-2">
        <div className="eyebrow" style={{ marginBottom:8 }}>Operación Bitcoin (bear market)</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{eur(huchaBTC)}</span>
          </label>
          <span className="num" style={{ color:C.faint }}>/ {eur(OBJETIVO_BTC_OP.objetivo)}</span>
        </div>
        <input className="inp" type="number" step="any" value={huchaBTC} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setHuchaBTC(parseFloat(event.target.value)||0)} style={{ maxWidth:160, marginBottom:12 }} />
        <div className="barra" style={{ marginBottom:12 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, huchaBTC/OBJETIVO_BTC_OP.objetivo*100)}%`, background:C.acc }} />
        </div>
        <div style={{ fontSize:12, color:C.sub, marginBottom:14 }}>Hucha para 2 tramos en nov–dic 2026 (financiada con AW liberado + Kindle liberado + ~50€/mes caprichos, ventana {OBJETIVO_BTC_OP.ventana}).</div>
        <div className="eyebrow" style={{ marginBottom:8 }}>3 condiciones inamovibles</div>
        <label style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, fontSize:12.5, color: condFondo?C.sub:C.bad }}>
          <input type="checkbox" checked={condFondo} disabled readOnly /> Fondo de emergencia &gt;1.000€ intacto
        </label>
        <label style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, fontSize:12.5, color:C.sub }}>
          <input type="checkbox" checked={condicionesBTC.prescindible} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setCondicionesBTC(c=>({...c,prescindible:event.target.checked}))} /> Dinero prescindible (no del fondo)
        </label>
        <label style={{ display:"flex", gap:8, alignItems:"center", fontSize:12.5, color:C.sub }}>
          <input type="checkbox" checked={condicionesBTC.dcaActivo} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setCondicionesBTC(c=>({...c,dcaActivo:event.target.checked}))} /> El DCA mensual no se pausa
        </label>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: MetricProps): React.JSX.Element {
  return (
    <div>
      <div style={{ fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:".1em", textTransform:"uppercase", color:"#5d6f78", marginBottom:6 }}>{label}</div>
      <div className="num" style={{ fontSize:22, fontWeight:600 }}>{value}</div>
      <div style={{ fontSize:12, color:"#8fa3ad", marginTop:2 }}>{sub}</div>
    </div>
  );
}
