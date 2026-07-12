"use client";

import React from "react";
import { palette } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import { idGenerator } from "@/lib/IdGenerator";
import type { Phase, BtcConditions } from "@/features/goals/domain/types";
import { FI_GOAL, HOUSING_GOAL, BTC_OP_GOAL, PHASES } from "@/features/goals/domain/config";
import type { PortfolioDerived } from "@/features/wealth/domain/PortfolioCalculator";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import { WEALTH_TARGETS_INITIAL } from "@/features/wealth/data/wealthTargets";
import { financialProjectionCalculator } from "@/features/goals/domain/FinancialProjectionCalculator";
import type { Debt } from "@/shared/domain/types";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import { Metric } from "@/shared/ui/Metric";
import { GoalsSettingsOnboarding } from "@/features/goals/components/GoalsSettingsOnboarding";

export interface GoalsTabProps {
  portfolioDerived: PortfolioDerived;
  debts: Debt[];
  setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
  settings: GoalsSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<GoalsSettings | null>>;
  wealthTargets: WealthTargets | null;
}

type EditableDebtTextField = "name" | "note";
type EditableDebtNumberField = "installment" | "balance";

export function GoalsTab({ portfolioDerived, debts, setDebts, settings, setSettings, wealthTargets }: GoalsTabProps): React.JSX.Element {
  if (settings == null) {
    return <GoalsSettingsOnboarding onCreateSettings={setSettings} />;
  }

  const effectiveWealthTargets = wealthTargets ?? WEALTH_TARGETS_INITIAL;

  const { currentSalary, fiContribution, fiReturn, btcSavings, btcConditions } = settings;
  const setCurrentSalary = (value: number): void => setSettings(previous => (previous ? { ...previous, currentSalary: value } : previous));
  const setFiContribution = (value: number): void => setSettings(previous => (previous ? { ...previous, fiContribution: value } : previous));
  const setFiReturn = (value: number): void => setSettings(previous => (previous ? { ...previous, fiReturn: value } : previous));
  const setBtcSavings = (value: number): void => setSettings(previous => (previous ? { ...previous, btcSavings: value } : previous));
  const updateBtcConditions = (updater: (conditions: BtcConditions) => BtcConditions): void => setSettings(previous => (previous ? { ...previous, btcConditions: updater(previous.btcConditions) } : previous));

  const { total, invested, liquidityTotal } = portfolioDerived;

  const totalDebt = debts.reduce((sum,debt)=>sum+(debt.balance||0),0);
  const netWorth = total - totalDebt;

  const editDebtText = (id: string, field: EditableDebtTextField, value: string): void => setDebts(debtList => debtList.map(debt => debt.id===id ? { ...debt, [field]: value } : debt));
  const editDebtNumber = (id: string, field: EditableDebtNumberField, value: string): void => setDebts(debtList => debtList.map(debt => debt.id===id ? { ...debt, [field]: parseFloat(value)||0 } : debt));
  const markSettled = (id: string): void => setDebts(debtList => debtList.map(debt => debt.id===id ? { ...debt, balance: 0 } : debt));
  const removeDebt = (id: string): void => setDebts(debtList => debtList.filter(debt => debt.id !== id));
  const addDebt = (): void => setDebts(debtList => [...debtList, { id: idGenerator.generate(), name: "Nueva deuda", installment: 0, balance: 0, note: "" }]);

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

  const emergencyFundMet = liquidityTotal >= effectiveWealthTargets.minimumFund;

  return (
    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>

      <div className="card span-2">
        <div className="eyebrow" style={{ marginBottom:8 }}>Libertad financiera</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:32, fontWeight:600 }}>{currencyFormatter.euro(total)}</span>
          <span className="num" style={{ color:palette.faint }}>/ {currencyFormatter.euro(FI_GOAL.capital)}</span>
        </div>
        <div className="barra" style={{ height:10, marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, total/FI_GOAL.capital*100)}%`, background:`linear-gradient(90deg,${palette.faint},${palette.acc})` }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub, marginBottom:16 }}>{currencyFormatter.percent(total/FI_GOAL.capital*100)} del objetivo de {currencyFormatter.euro(FI_GOAL.capital)} (renta de ~{currencyFormatter.euro(FI_GOAL.monthlyIncome)}/mes, regla del 4%).</div>

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
            ? <>A este ritmo llegarías a los {currencyFormatter.euro(FI_GOAL.capital)} en <strong className="num">~{fiYears.toFixed(1)} años</strong> (hacia <strong className="num">{fiTargetYear}</strong>, con ~<strong className="num">{fiTargetAge?.toFixed(0)}</strong> años).</>
            : <>Con estos parámetros no se alcanza el objetivo en un horizonte razonable. Sube la aportación o revisa la rentabilidad esperada.</>}
        </div>
        <div style={{ fontSize:11.5, color:palette.faint, marginTop:8 }}>Estimación con interés compuesto mensual, no es una garantía. El salario, no la rentabilidad, es tu mayor palanca (regla nº8).</div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:8 }}>Vivienda</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{currencyFormatter.euro(invested)}</span>
          <span className="num" style={{ color:palette.faint }}>/ {currencyFormatter.euro(HOUSING_GOAL.criticalMass)}</span>
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
          <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{currencyFormatter.euro(liquidityTotal)}</span>
          <span className="num" style={{ color:palette.faint }}>/ {currencyFormatter.euro(effectiveWealthTargets.emergencyFund)}</span>
        </div>
        <div className="barra" style={{ marginBottom:10 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, liquidityTotal/effectiveWealthTargets.emergencyFund*100)}%`, background: emergencyFundMet ? palette.acc : palette.bad }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub }}>
          {emergencyFundMet ? "Mínimo intocable cubierto." : `Por debajo del mínimo de ${currencyFormatter.euro(effectiveWealthTargets.minimumFund)}: es la prioridad.`} Objetivo 6 meses de gastos ({currencyFormatter.euro(effectiveWealthTargets.emergencyFund)}).
        </div>
      </div>

      <div className="card span-2">
        <div className="eyebrow" style={{ marginBottom:14 }}>Deudas y patrimonio neto</div>
        {debts.length === 0 ? (
          <div style={{ fontSize:12.5, color:palette.faint, marginBottom:14 }}>Aún no has añadido deudas.</div>
        ) : (
          debts.map(debt => (
            <div key={debt.id} className="deuda-row" style={{ marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${palette.line}` }}>
              <div>
                <label>
                  <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Nombre</div>
                  <input className="inp" value={debt.name} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDebtText(debt.id,"name",event.target.value)} style={{fontFamily:"'DM Sans',sans-serif"}} />
                </label>
                <label style={{ display:"block", marginTop:6 }}>
                  <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Nota</div>
                  <input className="inp" value={debt.note} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDebtText(debt.id,"note",event.target.value)} style={{fontFamily:"'DM Sans',sans-serif"}} />
                </label>
              </div>
              <label>
                <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Cuota/mes</div>
                <input className="inp" type="number" step="any" value={debt.installment} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDebtNumber(debt.id,"installment",event.target.value)} />
              </label>
              <label>
                <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Saldo pendiente</div>
                <input className="inp" type="number" step="any" value={debt.balance} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDebtNumber(debt.id,"balance",event.target.value)} />
              </label>
              <div style={{ display:"flex", gap:6 }}>
                <button className="seg" onClick={()=>markSettled(debt.id)} title="Marcar como liquidada">Liquidar</button>
                <button className="seg" onClick={()=>removeDebt(debt.id)} title="Eliminar deuda" style={{ color:palette.bad }}>Eliminar</button>
              </div>
            </div>
          ))
        )}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginTop:14 }}>
          <Metric label="Deuda total" value={currencyFormatter.euro(totalDebt)} sub="suma de saldos pendientes" />
          <Metric label="Patrimonio neto" value={currencyFormatter.euro(netWorth)} sub="activos − deudas" />
          <button className="seg on" onClick={addDebt}>+ Añadir deuda</button>
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
            Para desbloquear <strong style={{color:palette.ink}}>Fase {nextPhase.id}</strong> necesitas salario &gt;{currencyFormatter.euro(nextPhase.minSalary)}{nextPhase.minPortfolio>0 && ` y cartera >${currencyFormatter.euro(nextPhase.minPortfolio)}`}.
          </div>
        )}
      </div>

      <div className="card span-2">
        <div className="eyebrow" style={{ marginBottom:8 }}>Operación Bitcoin (bear market)</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span className="num disp" style={{ fontSize:26, fontWeight:600 }}>{currencyFormatter.euro(btcSavings)}</span>
          </label>
          <span className="num" style={{ color:palette.faint }}>/ {currencyFormatter.euro(BTC_OP_GOAL.target)}</span>
        </div>
        <input className="inp" type="number" step="any" value={btcSavings} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setBtcSavings(parseFloat(event.target.value)||0)} style={{ maxWidth:160, marginBottom:12 }} />
        <div className="barra" style={{ marginBottom:12 }}>
          <div className="barra-fill" style={{ width:`${Math.min(100, btcSavings/BTC_OP_GOAL.target*100)}%`, background:palette.acc }} />
        </div>
        <div style={{ fontSize:12, color:palette.sub, marginBottom:14 }}>Hucha para 2 tramos (financiada con deudas liquidadas + ~50€/mes caprichos, ventana {BTC_OP_GOAL.window}).</div>
        <div className="eyebrow" style={{ marginBottom:8 }}>3 condiciones inamovibles</div>
        <label style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, fontSize:12.5, color: emergencyFundMet?palette.sub:palette.bad }}>
          <input type="checkbox" checked={emergencyFundMet} disabled readOnly /> Fondo de emergencia &gt;{currencyFormatter.euro(effectiveWealthTargets.minimumFund)} intacto
        </label>
        <label style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, fontSize:12.5, color:palette.sub }}>
          <input type="checkbox" checked={btcConditions.disposable} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>updateBtcConditions(conditions=>({...conditions,disposable:event.target.checked}))} /> Dinero prescindible (no del fondo)
        </label>
        <label style={{ display:"flex", gap:8, alignItems:"center", fontSize:12.5, color:palette.sub }}>
          <input type="checkbox" checked={btcConditions.dcaActive} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>updateBtcConditions(conditions=>({...conditions,dcaActive:event.target.checked}))} /> El DCA mensual no se pausa
        </label>
      </div>
    </div>
  );
}
