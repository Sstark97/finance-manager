"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { palette, seriesColorAt } from "@/lib/theme";
import { formatEuro, formatEuroWithCents, formatPercent, generateId } from "@/lib/format";
import type {
  CategoriaId, GastoFijoItem, CategoriaEvento, Mes,
  PresupuestoBase, PresupuestoBaseBorrador,
} from "@/domain/types";
import { esMesDisponible } from "@/domain/presupuesto/mes";
import { CATEGORIAS, CATEGORIA_LABEL } from "@/domain/config";
import { presupuestoMensualCalculator } from "@/domain/PresupuestoMensualCalculator";

export interface PresupuestoTabProps {
  presupuestoBase: PresupuestoBase;
  setPresupuestoBase: React.Dispatch<React.SetStateAction<PresupuestoBase>>;
  meses: Mes[];
  setMeses: React.Dispatch<React.SetStateAction<Mes[]>>;
  gastosFijosItems: GastoFijoItem[];
  setGastosFijosItems: React.Dispatch<React.SetStateAction<GastoFijoItem[]>>;
}

interface BorradorDesglose {
  ingresoNetoOverride: number | null;
  overrides: Partial<Record<CategoriaId, number>>;
  real: Partial<Record<CategoriaId, number | null>>;
}

type CampoPresupuestoBaseEditable = "ingresoNeto" | CategoriaId;
type CampoGastoFijoEditable = "nombre" | "importe";

export function PresupuestoTab({ presupuestoBase, setPresupuestoBase, meses, setMeses, gastosFijosItems, setGastosFijosItems }: PresupuestoTabProps): React.JSX.Element {
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
