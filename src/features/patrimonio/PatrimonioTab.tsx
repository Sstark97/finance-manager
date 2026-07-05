"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { palette, seriesColorAt } from "@/lib/theme";
import { formatEuro, formatEuroWithCents, formatPercent, generateId } from "@/lib/format";
import type { Posicion, PuntoHistorico, TipoPosicion, CompItem } from "@/domain/types";
import type { Debt } from "@/shared/domain/types";
import { OBJETIVOS, COMPOSICION } from "@/domain/config";
import type { CarteraDerivada } from "@/domain/CarteraCalculator";
import { fetchYahooPrice } from "@/infrastructure/precios";
import { Metric } from "@/shared/ui/Metric";

interface Alerta {
  t: "good" | "warn" | "bad";
  m: string;
}

type VistaComposicion = "paises" | "sectores";

export interface PatrimonioTabProps {
  cartera: Posicion[];
  setCartera: React.Dispatch<React.SetStateAction<Posicion[]>>;
  historico: PuntoHistorico[];
  derivada: CarteraDerivada;
  deudas: Debt[];
}

type CampoPosicionEditable = "nombre" | "tipo" | "ticker" | "participaciones" | "precio";

export function PatrimonioTab({ cartera, setCartera, historico, derivada, deudas }: PatrimonioTabProps): React.JSX.Element {
  const [estanflacion, setEstanflacion] = useState<boolean>(true);
  const [editando, setEditando] = useState<boolean>(false);
  const [drilldown, setDrilldown] = useState<string>("world");
  const [vista, setVista] = useState<VistaComposicion>("paises");
  const [cargandoPrecios, setCargandoPrecios] = useState<boolean>(false);

  const { total, invertido, liquidezTotal, rv, btcTotal, btcPesoTotal, pesoRVde, pieCartera } = derivada;

  const ultimoHist = historico[historico.length - 1]?.total ?? total;
  const variacion = total - ultimoHist;
  const variacionPct = ultimoHist ? (variacion / ultimoHist) * 100 : 0;

  const deudaTotal = deudas.reduce((s,d)=>s+(d.balance||0),0);
  const patrimonioNeto = total - deudaTotal;

  const diasApplewatch = useMemo((): number | null => {
    const d = deudas.find(x => x.id === "applewatch");
    if (!d || d.balance <= 0 || !d.deadline) return null;
    const dias = Math.ceil((new Date(d.deadline).getTime() - new Date().getTime()) / 86400000);
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
