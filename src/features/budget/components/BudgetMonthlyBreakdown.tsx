"use client";

import React, { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from "recharts";
import { palette } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import { idGenerator } from "@/lib/IdGenerator";
import type { CategoryId, EventCategory, Month, Budget } from "@/features/budget/domain/types";
import { monthAvailability } from "@/features/budget/domain/MonthAvailability";
import { CATEGORIES, CATEGORY_LABEL } from "@/features/budget/domain/config";
import { monthlyBudgetCalculator } from "@/features/budget/domain/MonthlyBudgetCalculator";

export interface BudgetMonthlyBreakdownProps {
  baseBudget: Budget;
  months: Month[];
  setMonths: React.Dispatch<React.SetStateAction<Month[]>>;
}

interface BreakdownDraft {
  netIncomeOverride: number | null;
  overrides: Partial<Record<CategoryId, number>>;
  actual: Partial<Record<CategoryId, number | null>>;
}

export function BudgetMonthlyBreakdown({ baseBudget, months, setMonths }: BudgetMonthlyBreakdownProps): React.JSX.Element {
  const availableMonths = months.filter(month => monthAvailability.isAvailable(month.date));
  const lastAvailableId = availableMonths[availableMonths.length - 1]?.id ?? months[months.length - 1].id;

  const [monthId, setMonthId] = useState<string>(lastAvailableId);
  const [newEvent, setNewEvent] = useState<{ name: string; amount: string; category: EventCategory }>({ name:"", amount:"", category:"gastosFijos" });
  const [breakdownOpen, setBreakdownOpen] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  // Si el mes seleccionado deja de estar disponible (no debería, pero por seguridad), se deriva
  // directamente el último disponible en el propio render, sin useEffect.
  const effectiveMonthId = availableMonths.some(month => month.id === monthId) ? monthId : lastAvailableId;

  const monthIndex = months.findIndex(month => month.id === effectiveMonthId);
  const month = months[monthIndex] ?? months[months.length - 1];
  const result = monthlyBudgetCalculator.calculate(month, baseBudget);

  // --------- Borrador editable del desglose: no toca "months" hasta pulsar Guardar ---------
  const [draft, setDraft] = useState<BreakdownDraft>({ netIncomeOverride: month.netIncomeOverride, overrides: month.overrides, actual: month.actual });
  const [syncedMonthId, setSyncedMonthId] = useState<string>(month.id);
  if (month.id !== syncedMonthId) {
    setSyncedMonthId(month.id);
    setDraft({ netIncomeOverride: month.netIncomeOverride, overrides: month.overrides, actual: month.actual });
    setSaved(false);
  }

  const draftResult = monthlyBudgetCalculator.calculate({ ...month, netIncomeOverride: draft.netIncomeOverride, overrides: draft.overrides, actual: draft.actual }, baseBudget);

  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify({ netIncomeOverride: month.netIncomeOverride, overrides: month.overrides, actual: month.actual });

  const editDraftOverride = (categoryId: CategoryId, value: string): void => setDraft(draft => ({
    ...draft, overrides: { ...draft.overrides, [categoryId]: value === "" ? undefined : (parseFloat(value) || 0) }
  }));
  const editDraftActual = (categoryId: CategoryId, value: string): void => setDraft(draft => ({
    ...draft, actual: { ...draft.actual, [categoryId]: value === "" ? null : (parseFloat(value) || 0) }
  }));
  const editDraftIncomeOverride = (value: string): void => setDraft(draft => ({
    ...draft, netIncomeOverride: value === "" ? null : (parseFloat(value) || 0)
  }));

  const saveBreakdown = (): void => {
    setMonths(monthList => monthList.map(item => item.id !== month.id ? item : { ...item, netIncomeOverride: draft.netIncomeOverride, overrides: draft.overrides, actual: draft.actual }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const discardChanges = (): void => setDraft({ netIncomeOverride: month.netIncomeOverride, overrides: month.overrides, actual: month.actual });

  const addEvent = (): void => {
    if (!newEvent.name || !newEvent.amount) return;
    setMonths(monthList => monthList.map(item => item.id !== month.id ? item : {
      ...item, events: [...item.events, { id: idGenerator.generate(), name: newEvent.name, amount: parseFloat(newEvent.amount) || 0, category: newEvent.category }]
    }));
    setNewEvent({ name:"", amount:"", category:"gastosFijos" });
  };
  const removeEvent = (eventId: string): void => setMonths(monthList => monthList.map(item => item.id !== month.id ? item : {
    ...item, events: item.events.filter(event => event.id !== eventId)
  }));

  const monthChartData = CATEGORIES.map(category => ({
    name: category.name.split(" ")[0],
    Presupuestado: result.values[category.id],
    Real: result.realized[category.id] ?? result.values[category.id],
  }));

  const annualEvolution = months.map(item => {
    const monthResult = monthlyBudgetCalculator.calculate(item, baseBudget);
    const savingsBudgeted = monthResult.values.inversion + monthResult.values.fondoEmergencia;
    const expenseBudgeted = monthResult.values.gastosFijos + monthResult.values.ocio + monthResult.values.caprichos;
    const savingsRegistered = monthResult.realized.inversion != null || monthResult.realized.fondoEmergencia != null;
    const expenseRegistered = monthResult.realized.gastosFijos != null || monthResult.realized.ocio != null || monthResult.realized.caprichos != null;
    const savingsActual = savingsRegistered ? (monthResult.realized.inversion ?? monthResult.values.inversion) + (monthResult.realized.fondoEmergencia ?? monthResult.values.fondoEmergencia) : null;
    const expenseActual = expenseRegistered ? (monthResult.realized.gastosFijos ?? monthResult.values.gastosFijos) + (monthResult.realized.ocio ?? monthResult.values.ocio) + (monthResult.realized.caprichos ?? monthResult.values.caprichos) : null;
    return { month: item.label, savingsBudgeted, savingsActual, expenseBudgeted, expenseActual };
  });

  return (
    <>
      <div className="card span-full" style={{ paddingBottom:14 }}>
        <div className="eyebrow" style={{ marginBottom:10 }}>Cargar información del mes</div>
        <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <select className="inp" value={month.id} onChange={(event: React.ChangeEvent<HTMLSelectElement>)=>setMonthId(event.target.value)} style={{ maxWidth:220 }}>
            {availableMonths.map(availableMonth => {
              const hasDeviations = Object.keys(availableMonth.overrides||{}).length>0 || (availableMonth.events||[]).length>0;
              return <option key={availableMonth.id} value={availableMonth.id}>{availableMonth.label}{hasDeviations ? " ·" : ""}</option>;
            })}
          </select>
          <span style={{ fontSize:11.5, color:palette.faint }}>Solo se muestran meses ya iniciados (previos o el actual). Los meses futuros aparecerán cuando llegue su turno.</span>
        </div>
      </div>

      <div className="card span-full">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <button className="eyebrow" onClick={()=>setBreakdownOpen(previous=>!previous)} style={{ background:"none", border:"none", padding:0, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ display:"inline-block", transition:".15s", transform: breakdownOpen?"rotate(90deg)":"rotate(0deg)" }}>▸</span>
            {month.label} · desglose
          </button>
          <div className="num" style={{ fontSize:12.5 }}>
            <span style={{ color:palette.sub }}>Sobrante (guardado): </span>
            <span style={{ color: result.surplus >= 0 ? palette.acc : palette.bad, fontWeight:600 }}>{currencyFormatter.euroWithCents(result.surplus)}</span>
          </div>
        </div>

        {breakdownOpen && (
        <div style={{ marginTop:16 }}>
        <label style={{ display:"block", marginBottom:16 }}>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Ingreso neto este mes {draft.netIncomeOverride==null && <span style={{color:palette.faint}}>(base: {currencyFormatter.euro(baseBudget.ingresoNeto)})</span>}</div>
          <input className="inp" type="number" step="any" placeholder={String(baseBudget.ingresoNeto)} value={draft.netIncomeOverride ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDraftIncomeOverride(event.target.value)} style={{ maxWidth:200 }} />
        </label>

        {CATEGORIES.map(category => {
          const categoryBase = baseBudget[category.id];
          const budgeted = draftResult.values[category.id];
          const manualActualValue = draftResult.actual[category.id];
          const realizedValue = draftResult.realized[category.id];
          const isRegistered = realizedValue != null;
          const delta = isRegistered ? realizedValue - budgeted : 0;
          const isOnTrack = category.type === "ahorro" ? delta >= 0 : delta <= 0;
          return (
            <div key={category.id} style={{ marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${palette.line}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6, flexWrap:"wrap", gap:6 }}>
                <span style={{ fontSize:13, color:palette.ink }}>{category.name}</span>
                <span className="num" style={{ fontSize:12.5, color:palette.faint }}>base {currencyFormatter.euro(categoryBase)}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <label>
                  <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Presupuestado (override mes)</div>
                  <input className="inp" type="number" step="any" placeholder={String(categoryBase)} value={draft.overrides?.[category.id] ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDraftOverride(category.id,event.target.value)} />
                </label>
                <label>
                  <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Real</div>
                  <input className="inp" type="number" step="any" placeholder="sin registrar" value={manualActualValue ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDraftActual(category.id,event.target.value)} />
                </label>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11.5 }} className="num">
                <span style={{ color:palette.sub }}>Total presupuestado: {currencyFormatter.euroWithCents(budgeted)}</span>
                {isRegistered && <span style={{ color: isOnTrack ? palette.acc : palette.bad }}>{delta>=0?"+":""}{currencyFormatter.euroWithCents(delta)} vs plan</span>}
              </div>
            </div>
          );
        })}

        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
          <button className={`seg ${hasUnsavedChanges ? "on" : ""}`} onClick={saveBreakdown} disabled={!hasUnsavedChanges}>Guardar cambios</button>
          {hasUnsavedChanges && <button className="seg" onClick={discardChanges}>Descartar</button>}
          {saved && <span style={{ fontSize:12, color:palette.acc }}>Guardado ✓</span>}
          {!saved && hasUnsavedChanges && <span style={{ fontSize:12, color:palette.warn }}>Cambios sin guardar</span>}
        </div>

        <div className="eyebrow" style={{ margin:"18px 0 10px" }}>Eventos / ajustes de este mes</div>
        {month.events.length === 0 && <div style={{ fontSize:12.5, color:palette.faint, marginBottom:10 }}>Sin ajustes puntuales este mes.</div>}
        {month.events.map(event => (
          <div key={event.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:8, fontSize:12.5 }}>
            <span style={{ color:palette.ink }}>{event.name} <span style={{ color:palette.faint }}>({CATEGORY_LABEL[event.category] || event.category})</span></span>
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span className="num" style={{ color:palette.warn }}>+{currencyFormatter.euroWithCents(event.amount)}</span>
              <button className="seg" onClick={()=>removeEvent(event.id)} style={{ color:palette.bad, padding:"3px 8px" }}>✕</button>
            </span>
          </div>
        ))}
        <div className="evt-row" style={{ marginTop:10 }}>
          <input className="inp" placeholder="Nombre (ej. deuda puntual)" value={newEvent.name} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setNewEvent(previous=>({...previous,name:event.target.value}))} style={{fontFamily:"'DM Sans',sans-serif"}} />
          <input className="inp" type="number" step="any" placeholder="Importe" value={newEvent.amount} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setNewEvent(previous=>({...previous,amount:event.target.value}))} />
          <select className="inp" value={newEvent.category} onChange={(event: React.ChangeEvent<HTMLSelectElement>)=>setNewEvent(previous=>({...previous,category:event.target.value as EventCategory}))}>
            {CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
            <option value="ingreso">Ingreso (sueldo, extra)</option>
          </select>
          <button className="seg on" onClick={addEvent}>+ Añadir</button>
        </div>
        </div>
        )}
      </div>

      <div className="card span-full">
        <div className="eyebrow" style={{ marginBottom:14 }}>{month.label} · presupuestado vs real</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthChartData} margin={{ left:-16, right:8, top:6 }}>
            <CartesianGrid stroke={palette.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="name" stroke={palette.faint} tick={{ fontSize:10.5, fontFamily:"DM Mono" }} interval={0} />
            <YAxis stroke={palette.faint} tick={{ fontSize:11, fontFamily:"DM Mono" }} tickFormatter={(value)=>`${value}`} />
            <Tooltip formatter={(value)=>currencyFormatter.euroWithCents(Number(value))} cursor={{ fill: palette.panel2 }} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8}} labelStyle={{color:palette.sub}} itemStyle={{color:palette.ink}} />
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
          <LineChart data={annualEvolution} margin={{ left:-10, right:10, top:6 }}>
            <CartesianGrid stroke={palette.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="month" stroke={palette.faint} tick={{ fontSize:11.5, fontFamily:"DM Mono" }} />
            <YAxis stroke={palette.faint} tick={{ fontSize:12, fontFamily:"DM Mono" }} />
            <Tooltip formatter={(value)=>(value==null?"sin registrar":currencyFormatter.euroWithCents(Number(value)))} cursor={{ stroke: palette.faint, strokeWidth: 1 }} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8}} labelStyle={{color:palette.sub}} itemStyle={{color:palette.ink}} />
            <Legend wrapperStyle={{ fontSize:12 }} />
            <Line type="monotone" dataKey="savingsBudgeted" name="Ahorro presupuestado" stroke="#7e9c8a" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="savingsActual" name="Ahorro real" stroke={palette.acc} strokeWidth={3} dot={{ r:4 }} connectNulls={false} />
            <Line type="monotone" dataKey="expenseBudgeted" name="Gasto presupuestado" stroke="#b0654f" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="expenseActual" name="Gasto real" stroke={palette.warn} strokeWidth={3} dot={{ r:4 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
