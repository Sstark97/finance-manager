"use client";

import React from "react";
import { palette } from "@/lib/theme";
import { formatEuro, formatEuroWithCents, formatPercent } from "@/lib/format";
import type { Phase, BtcConditions } from "@/features/goals/domain/types";
import { FI_GOAL, HOUSING_GOAL, BTC_OP_GOAL, PHASES } from "@/features/goals/domain/config";
import { TARGETS } from "@/features/wealth/domain/config";
import type { PortfolioDerived } from "@/features/wealth/domain/PortfolioCalculator";
import { financialProjectionCalculator } from "@/features/goals/domain/FinancialProjectionCalculator";
import type { Debt } from "@/shared/domain/types";
import { Metric } from "@/shared/ui/Metric";

export interface GoalsTabProps {
  portfolioDerived: PortfolioDerived;
  debts: Debt[];
  setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
  currentSalary: number;
  setCurrentSalary: React.Dispatch<React.SetStateAction<number>>;
  fiContribution: number;
  setFiContribution: React.Dispatch<React.SetStateAction<number>>;
  fiReturn: number;
  setFiReturn: React.Dispatch<React.SetStateAction<number>>;
  btcSavings: number;
  setBtcSavings: React.Dispatch<React.SetStateAction<number>>;
  btcConditions: BtcConditions;
  setBtcConditions: React.Dispatch<React.SetStateAction<BtcConditions>>;
  countCar: boolean;
  setCountCar: React.Dispatch<React.SetStateAction<boolean>>;
}

type EditableDebtField = "installment" | "balance";

export function GoalsTab({
  portfolioDerived, debts, setDebts,
  currentSalary, setCurrentSalary,
  fiContribution, setFiContribution,
  fiReturn, setFiReturn,
  btcSavings, setBtcSavings,
  btcConditions, setBtcConditions,
  countCar, setCountCar,
}: GoalsTabProps): React.JSX.Element {
  const { total, invested, liquidityTotal } = portfolioDerived;

  const carDebt = debts.find(debt => debt.id === "coche");
  const totalDebt = debts.reduce((sum,debt)=>sum+(debt.balance||0),0);
  const debtWithoutCar = totalDebt - (carDebt?.balance || 0);
  const netWorth = countCar ? total - debtWithoutCar : total - totalDebt;

  const editDebt = (id: string, field: EditableDebtField, value: string): void => setDebts(debtList => debtList.map(debt => debt.id===id ? { ...debt, [field]: parseFloat(value)||0 } : debt));
  const markSettled = (id: string): void => setDebts(debtList => debtList.map(debt => debt.id===id ? { ...debt, balance: 0 } : debt));

  const appleWatchDaysLeft = ((): number | null => {
    const debt = debts.find(x => x.id === "applewatch");
    if (!debt || debt.balance <= 0 || !debt.deadline) return null;
    return Math.ceil((new Date(debt.deadline).getTime() - new Date().getTime()) / 86400000);
  })();

  const projection = financialProjectionCalculator.project({
    initial: total, contribution: fiContribution, annualReturn: fiReturn, target: FI_GOAL.capital,
  });
  const fiYears: number | null = projection.months ? projection.months/12 : null;
  const fiTargetYear: number | null = projection.months && fiYears != null ? new Date().getFullYear() + Math.ceil(fiYears) : null;
  const fiTargetAge: number | null = projection.months && fiYears != null ? (FI_GOAL.currentAge + fiYears) : null;

  const currentPhase = ((): Phase => {
    const reached = PHASES.filter(phase => currentSalary >= phase.minSalary && total >= phase.minPortfolio);
    return reached.length ? reached[reached.length-1] : PHASES[0];
  })();
  const nextPhase = PHASES.find(phase => phase.id === currentPhase.id + 1);

  const emergencyFundMet = liquidityTotal >= TARGETS.minimumFund;

  return (
    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>

      {appleWatchDaysLeft != null && appleWatchDaysLeft >= 0 && (
        <div className="card span-full" style={{ borderColor: appleWatchDaysLeft<=3?palette.bad:palette.warn, background: appleWatchDaysLeft<=3 ? "#2a1710" : palette.panel }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <span style={{ fontSize:22 }}>⚠</span>
            <div>
              <div style={{ fontSize:14, color:palette.ink, fontWeight:600 }}>Liquidar Apple Watch (revolving 24% TAE)</div>
              <div style={{ fontSize:12.5, color:palette.sub, marginTop:2 }}>Quedan <strong style={{color:palette.ink}}>{appleWatchDaysLeft} día{appleWatchDaysLeft===1?"":"s"}</strong> antes del 10 de julio de 2026. Saldo: {formatEuroWithCents(debts.find(debt=>debt.id==="applewatch")?.balance || 0)}. Pasa la tarjeta a pago total y no la vuelvas a usar en revolving.</div>
            </div>
          </div>
        </div>
      )}

      <div className="card span-2">
        <div className="eyebrow" style={{ marginBottom:8 }}>Libertad financiera</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:32, fontWeight:600 }}>{formatEuro(total)}</span>
          <span className="num" style={{ color:palette.faint }}>/ {formatEuro(FI_GOAL.capital)}</span>
        </div>
        <div className="barra" style={{ height:10, marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, total/FI_GOAL.capital*100)}%`, background:`linear-gradient(90deg,${palette.faint},${palette.acc})` }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub, marginBottom:16 }}>{formatPercent(total/FI_GOAL.capital*100)} del objetivo de {formatEuro(FI_GOAL.capital)} (renta de ~{formatEuro(FI_GOAL.monthlyIncome)}/mes, regla del 4%).</div>

        <div className="grid" style={{ gridTemplateColumns:"1fr 1fr", marginBottom:14 }}>
          <label>
            <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Aportación mensual (€)</div>
            <input className="inp" type="number" step="any" value={fiContribution} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setFiContribution(parseFloat(event.target.value)||0)} />
          </label>
          <label>
            <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Rentabilidad anual esperada</div>
            <input className="inp" type="number" step="0.01" value={fiReturn} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setFiReturn(parseFloat(event.target.value)||0)} />
          </label>
        </div>
        <div style={{ fontSize:13, lineHeight:1.6, color:palette.ink }}>
          {projection.months && fiYears != null
            ? <>A este ritmo llegarías a los {formatEuro(FI_GOAL.capital)} en <strong className="num">~{fiYears.toFixed(1)} años</strong> (hacia <strong className="num">{fiTargetYear}</strong>, con ~<strong className="num">{fiTargetAge?.toFixed(0)}</strong> años).</>
            : <>Con estos parámetros no se alcanza el objetivo en un horizonte razonable. Sube la aportación o revisa la rentabilidad esperada.</>}
        </div>
        <div style={{ fontSize:11.5, color:palette.faint, marginTop:8 }}>Estimación con interés compuesto mensual, no es una garantía. El salario, no la rentabilidad, es tu mayor palanca (regla nº8).</div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:8 }}>Vivienda</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{formatEuro(invested)}</span>
          <span className="num" style={{ color:palette.faint }}>/ {formatEuro(HOUSING_GOAL.criticalMass)}</span>
        </div>
        <div className="barra" style={{ marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, invested/HOUSING_GOAL.criticalMass*100)}%`, background:palette.acc }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub, lineHeight:1.6 }}>
          Masa crítica invertida objetivo para usar la cartera como <strong style={{color:palette.ink}}>garantía</strong> (no pignoración) de una hipoteca al 100%. Horizonte {HOUSING_GOAL.horizon}, sin presión de plazo. Dinero a &lt;5 años nunca va a renta variable.
        </div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:8 }}>Fondo de emergencia</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{formatEuro(liquidityTotal)}</span>
          <span className="num" style={{ color:palette.faint }}>/ {formatEuro(TARGETS.emergencyFund)}</span>
        </div>
        <div className="barra" style={{ marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, liquidityTotal/TARGETS.emergencyFund*100)}%`, background: emergencyFundMet ? palette.acc : palette.bad }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub }}>
          {emergencyFundMet ? "Mínimo intocable cubierto." : `Por debajo del mínimo de ${formatEuro(TARGETS.minimumFund)}: es la prioridad.`} Objetivo 6 meses de gastos (4.900€).
        </div>
      </div>

      <div className="card span-2">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
          <div className="eyebrow">Deudas y patrimonio neto</div>
          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:palette.sub }}>
            <input type="checkbox" checked={countCar} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setCountCar(event.target.checked)} />
            Contar el coche como activo (neutraliza su deuda)
          </label>
        </div>
        {debts.map(debt => (
          <div key={debt.id} className="deuda-row" style={{ marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${palette.line}` }}>
            <div>
              <div style={{ fontSize:13, color:palette.ink }}>{debt.name}</div>
              <div style={{ fontSize:11, color: debt.deadline ? palette.warn : palette.faint, marginTop:2 }}>{debt.note}</div>
            </div>
            <label>
              <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Cuota/mes</div>
              <input className="inp" type="number" step="any" value={debt.installment} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDebt(debt.id,"installment",event.target.value)} />
            </label>
            <label>
              <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Saldo pendiente</div>
              <input className="inp" type="number" step="any" value={debt.balance} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDebt(debt.id,"balance",event.target.value)} />
            </label>
            <button className="seg" onClick={()=>markSettled(debt.id)} title="Marcar como liquidada">Liquidar</button>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginTop:14 }}>
          <Metric label="Deuda total" value={formatEuro(totalDebt)} sub="suma de saldos pendientes" />
          <Metric label="Patrimonio neto" value={formatEuro(netWorth)} sub={countCar ? "coche neutralizado" : "coche cuenta como deuda"} />
        </div>
      </div>

      <div className="card span-full">
        <div className="eyebrow" style={{ marginBottom:16 }}>Fases del plan (desbloqueadas por salario)</div>
        <label style={{ display:"block", marginBottom:18, maxWidth:220 }}>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Salario bruto anual actual</div>
          <input className="inp" type="number" step="1000" value={currentSalary} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setCurrentSalary(parseFloat(event.target.value)||0)} />
        </label>
        <div className="roadmap">
          {PHASES.map(phase => {
            const status = phase.id < currentPhase.id ? "done" : phase.id === currentPhase.id ? "now" : "";
            return (
              <div key={phase.id} className={`roadstep ${status}`}>
                <div className="eyebrow" style={{ color: status==="now" ? palette.acc : palette.faint, marginBottom:6 }}>Fase {phase.id} · {phase.age} años</div>
                <div style={{ fontSize:13.5, fontWeight:600, color: status ? palette.ink : palette.sub, marginBottom:6 }}>{phase.name}</div>
                <div style={{ fontSize:11.5, color:palette.sub, lineHeight:1.5, marginBottom:8 }}>{phase.description}</div>
                <div style={{ fontSize:11, color:palette.faint }}>{phase.minSalary>0 && `Trigger: salario >${(phase.minSalary/1000).toFixed(0)}K`}{phase.minPortfolio>0 && ` · cartera >${(phase.minPortfolio/1000).toFixed(0)}K`}</div>
              </div>
            );
          })}
        </div>
        {nextPhase && (
          <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${palette.line}`, fontSize:12.5, color:palette.sub }}>
            Para desbloquear <strong style={{color:palette.ink}}>Fase {nextPhase.id}</strong> necesitas salario &gt;{formatEuro(nextPhase.minSalary)}{nextPhase.minPortfolio>0 && ` y cartera >${formatEuro(nextPhase.minPortfolio)}`}.
          </div>
        )}
      </div>

      <div className="card span-2">
        <div className="eyebrow" style={{ marginBottom:8 }}>Operación Bitcoin (bear market)</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{formatEuro(btcSavings)}</span>
          </label>
          <span className="num" style={{ color:palette.faint }}>/ {formatEuro(BTC_OP_GOAL.target)}</span>
        </div>
        <input className="inp" type="number" step="any" value={btcSavings} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setBtcSavings(parseFloat(event.target.value)||0)} style={{ maxWidth:160, marginBottom:12 }} />
        <div className="barra" style={{ marginBottom:12 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, btcSavings/BTC_OP_GOAL.target*100)}%`, background:palette.acc }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub, marginBottom:14 }}>Hucha para 2 tramos en nov–dic 2026 (financiada con AW liberado + Kindle liberado + ~50€/mes caprichos, ventana {BTC_OP_GOAL.window}).</div>
        <div className="eyebrow" style={{ marginBottom:8 }}>3 condiciones inamovibles</div>
        <label style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, fontSize:12.5, color: emergencyFundMet?palette.sub:palette.bad }}>
          <input type="checkbox" checked={emergencyFundMet} disabled readOnly /> Fondo de emergencia &gt;1.000€ intacto
        </label>
        <label style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, fontSize:12.5, color:palette.sub }}>
          <input type="checkbox" checked={btcConditions.disposable} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setBtcConditions(conditions=>({...conditions,disposable:event.target.checked}))} /> Dinero prescindible (no del fondo)
        </label>
        <label style={{ display:"flex", gap:8, alignItems:"center", fontSize:12.5, color:palette.sub }}>
          <input type="checkbox" checked={btcConditions.dcaActive} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setBtcConditions(conditions=>({...conditions,dcaActive:event.target.checked}))} /> El DCA mensual no se pausa
        </label>
      </div>
    </div>
  );
}
