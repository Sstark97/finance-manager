"use client";

import React, { useMemo } from "react";
import { palette } from "@/lib/theme";
import { formatEuro, formatEuroWithCents, formatPercent } from "@/lib/format";
import type { Deuda, Fase, CondicionesBTC } from "@/domain/types";
import { OBJETIVOS, OBJETIVO_FI, OBJETIVO_VIVIENDA, OBJETIVO_BTC_OP, FASES } from "@/domain/config";
import type { CarteraDerivada } from "@/domain/CarteraCalculator";
import { proyeccionFinancieraCalculator } from "@/domain/ProyeccionFinancieraCalculator";
import { Metric } from "@/components/Metric";

export interface MetasTabProps {
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

type CampoDeudaEditable = "cuota" | "saldo";

export function MetasTab({
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
