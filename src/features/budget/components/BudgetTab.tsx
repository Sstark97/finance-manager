"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { palette, seriesColorAt } from "@/lib/theme";
import { formatEuro, formatEuroWithCents, formatPercent, generateId } from "@/lib/format";
import type {
  CategoryId, FixedExpenseItem, EventCategory, Month,
  Budget, BudgetDraft,
} from "@/features/budget/domain/types";
import { isMonthAvailable } from "@/features/budget/domain/month";
import { CATEGORIES, CATEGORY_LABEL } from "@/features/budget/domain/config";
import { monthlyBudgetCalculator } from "@/features/budget/domain/MonthlyBudgetCalculator";

export interface BudgetTabProps {
  baseBudget: Budget;
  setBaseBudget: React.Dispatch<React.SetStateAction<Budget>>;
  months: Month[];
  setMonths: React.Dispatch<React.SetStateAction<Month[]>>;
  fixedExpenseItems: FixedExpenseItem[];
  setFixedExpenseItems: React.Dispatch<React.SetStateAction<FixedExpenseItem[]>>;
}

interface BreakdownDraft {
  netIncomeOverride: number | null;
  overrides: Partial<Record<CategoryId, number>>;
  actual: Partial<Record<CategoryId, number | null>>;
}

type EditableBudgetField = "ingresoNeto" | CategoryId;
type EditableFixedExpenseField = "name" | "amount";

export function BudgetTab({ baseBudget, setBaseBudget, months, setMonths, fixedExpenseItems, setFixedExpenseItems }: BudgetTabProps): React.JSX.Element {
  // --------- Presupuesto base anual: modo visual + modo edición con borrador y Guardar ---------
  const [baseEditing, setBaseEditing] = useState<boolean>(false);
  const [baseSaved, setBaseSaved] = useState<boolean>(false);
  const [baseDraft, setBaseDraft] = useState<BudgetDraft>(() => ({ ...baseBudget, fixedExpenseItems }));
  const [newFixedExpense, setNewFixedExpense] = useState<{ name: string; amount: string }>({ name:"", amount:"" });

  const draftFixedExpensesTotal = useMemo(() => baseDraft.fixedExpenseItems.reduce((sum,item)=>sum+(item.amount||0),0), [baseDraft.fixedExpenseItems]);

  const startBaseEditing = (): void => {
    setBaseDraft({ ...baseBudget, fixedExpenseItems: fixedExpenseItems.map(item => ({ ...item })) });
    setBaseEditing(true);
  };
  const cancelBaseEditing = (): void => setBaseEditing(false);
  const saveBase = (): void => {
    setBaseBudget({
      ingresoNeto: baseDraft.ingresoNeto,
      gastosFijos: draftFixedExpensesTotal,
      inversion: baseDraft.inversion,
      fondoEmergencia: baseDraft.fondoEmergencia,
      ocio: baseDraft.ocio,
      caprichos: baseDraft.caprichos,
    });
    setFixedExpenseItems(baseDraft.fixedExpenseItems);
    setBaseEditing(false);
    setBaseSaved(true);
    setTimeout(() => setBaseSaved(false), 2000);
  };

  const editBaseDraft = (field: EditableBudgetField, value: string): void => setBaseDraft(draft => ({ ...draft, [field]: parseFloat(value) || 0 }));
  const editFixedExpense = (id: string, field: EditableFixedExpenseField, value: string): void => setBaseDraft(draft => ({
    ...draft, fixedExpenseItems: draft.fixedExpenseItems.map(item => item.id !== id ? item : { ...item, [field]: field === "amount" ? (parseFloat(value) || 0) : value } as FixedExpenseItem)
  }));
  const removeFixedExpense = (id: string): void => setBaseDraft(draft => ({ ...draft, fixedExpenseItems: draft.fixedExpenseItems.filter(item => item.id !== id) }));
  const addFixedExpense = (): void => {
    if (!newFixedExpense.name || !newFixedExpense.amount) return;
    setBaseDraft(draft => ({ ...draft, fixedExpenseItems: [...draft.fixedExpenseItems, { id: generateId(), name: newFixedExpense.name, amount: parseFloat(newFixedExpense.amount) || 0 }] }));
    setNewFixedExpense({ name:"", amount:"" });
  };

  const availableMonths = useMemo(() => months.filter(month => isMonthAvailable(month.date)), [months]);
  const lastAvailableId = availableMonths[availableMonths.length - 1]?.id;

  const [monthId, setMonthId] = useState<string | undefined>(lastAvailableId);
  const [newEvent, setNewEvent] = useState<{ name: string; amount: string; category: EventCategory }>({ name:"", amount:"", category:"gastosFijos" });
  const [breakdownOpen, setBreakdownOpen] = useState<boolean>(true);
  const [saved, setSaved] = useState<boolean>(false);

  // Si el mes seleccionado deja de estar disponible (no debería, pero por seguridad), se deriva
  // directamente el último disponible en el propio render, sin useEffect.
  const effectiveMonthId = availableMonths.some(month => month.id === monthId) ? monthId : lastAvailableId;

  const monthIndex = months.findIndex(month => month.id === effectiveMonthId);
  const month = months[monthIndex] ?? months[months.length - 1];
  const result = useMemo(() => monthlyBudgetCalculator.calculate(month, baseBudget), [month, baseBudget]);

  // --------- Borrador editable del desglose: no toca "months" hasta pulsar Guardar ---------
  const [draft, setDraft] = useState<BreakdownDraft>({ netIncomeOverride: month.netIncomeOverride, overrides: month.overrides, actual: month.actual });
  const [syncedMonthId, setSyncedMonthId] = useState<string>(month.id);
  if (month.id !== syncedMonthId) {
    setSyncedMonthId(month.id);
    setDraft({ netIncomeOverride: month.netIncomeOverride, overrides: month.overrides, actual: month.actual });
    setSaved(false);
  }

  const draftResult = useMemo(() => monthlyBudgetCalculator.calculate({ ...month, netIncomeOverride: draft.netIncomeOverride, overrides: draft.overrides, actual: draft.actual }, baseBudget), [month, draft, baseBudget]);

  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify({ netIncomeOverride: month.netIncomeOverride, overrides: month.overrides, actual: month.actual });

  const baseTotal = CATEGORIES.reduce((sum,category)=>sum+baseBudget[category.id],0);
  const baseUnassigned = baseBudget.ingresoNeto - baseTotal;

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
      ...item, events: [...item.events, { id: generateId(), name: newEvent.name, amount: parseFloat(newEvent.amount) || 0, category: newEvent.category }]
    }));
    setNewEvent({ name:"", amount:"", category:"gastosFijos" });
  };
  const removeEvent = (eventId: string): void => setMonths(monthList => monthList.map(item => item.id !== month.id ? item : {
    ...item, events: item.events.filter(event => event.id !== eventId)
  }));

  const monthChartData = CATEGORIES.map(category => ({
    name: category.name.split(" ")[0],
    Presupuestado: result.values[category.id],
    Real: result.actual[category.id] != null ? result.actual[category.id] : result.values[category.id],
  }));

  const annualEvolution = useMemo(() => months.map(item => {
    const monthResult = monthlyBudgetCalculator.calculate(item, baseBudget);
    const savingsBudgeted = monthResult.values.inversion + monthResult.values.fondoEmergencia;
    const expenseBudgeted = monthResult.values.gastosFijos + monthResult.values.ocio + monthResult.values.caprichos;
    const savingsRegistered = monthResult.actual.inversion != null || monthResult.actual.fondoEmergencia != null;
    const expenseRegistered = monthResult.actual.gastosFijos != null || monthResult.actual.ocio != null || monthResult.actual.caprichos != null;
    const savingsActual = savingsRegistered ? (monthResult.actual.inversion ?? monthResult.values.inversion) + (monthResult.actual.fondoEmergencia ?? monthResult.values.fondoEmergencia) : null;
    const expenseActual = expenseRegistered ? (monthResult.actual.gastosFijos ?? monthResult.values.gastosFijos) + (monthResult.actual.ocio ?? monthResult.values.ocio) + (monthResult.actual.caprichos ?? monthResult.values.caprichos) : null;
    return { month: item.label, savingsBudgeted, savingsActual, expenseBudgeted, expenseActual };
  }), [months, baseBudget]);

  const baseDonutData = CATEGORIES.map((category,index) => ({ name: category.name, value: baseBudget[category.id], color: seriesColorAt(index) }));
  const draftUnassigned = baseDraft.ingresoNeto - (draftFixedExpensesTotal + baseDraft.inversion + baseDraft.fondoEmergencia + baseDraft.ocio + baseDraft.caprichos);

  return (
    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>

      <div className="card span-full">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:6 }}>
          <div className="eyebrow">Presupuesto base anual</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {baseSaved && <span style={{ fontSize:12, color:palette.acc }}>Guardado ✓</span>}
            {!baseEditing && <button className="seg on" onClick={startBaseEditing}>Editar presupuesto</button>}
          </div>
        </div>
        <p style={{ margin:"0 0 16px", fontSize:12.5, color:palette.sub, lineHeight:1.5 }}>
          Esto es tu plantilla por defecto para cada mes del año. Cada mes concreto puede desviarse (sueldo distinto, un gasto extra, una deuda puntual) sin tocar esta base.
        </p>

        {!baseEditing ? (
          <div className="compo">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={baseDonutData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={2} stroke="none">
                  {baseDonutData.map((slice,sliceIndex) => <Cell key={sliceIndex} fill={slice.color} />)}
                </Pie>
                <Tooltip formatter={(value)=>formatEuroWithCents(Number(value))} itemStyle={{color:palette.ink}} labelStyle={{color:palette.sub}} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8,color:palette.ink}} />
              </PieChart>
            </ResponsiveContainer>
            <div>
              <div style={{ marginBottom:14 }}>
                <div className="eyebrow" style={{ marginBottom:4 }}>Ingreso neto /mes</div>
                <div className="num disp" style={{ fontSize:28, fontWeight:600 }}>{formatEuroWithCents(baseBudget.ingresoNeto)}</div>
              </div>
              {baseDonutData.map(slice => (
                <div key={slice.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, fontSize:13 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:8, color:palette.sub }}>
                    <span style={{ width:9, height:9, borderRadius:2, background:slice.color }} />
                    {slice.name}
                  </span>
                  <span className="num" style={{ color:palette.ink }}>{formatEuroWithCents(slice.value)} <span style={{ color:palette.faint }}>({formatPercent(baseBudget.ingresoNeto ? slice.value/baseBudget.ingresoNeto*100 : 0)})</span></span>
                </div>
              ))}
              <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${palette.line}`, fontSize:12.5 }} className="num">
                <span style={{ color:palette.sub }}>Sin asignar: </span>
                <span style={{ color: Math.abs(baseUnassigned) < 5 ? palette.acc : palette.warn, fontWeight:600 }}>{formatEuroWithCents(baseUnassigned)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))" }}>
              <label>
                <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Ingreso neto /mes</div>
                <input className="inp" type="number" step="any" value={baseDraft.ingresoNeto} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editBaseDraft("ingresoNeto",event.target.value)} />
              </label>
              {CATEGORIES.filter(category => category.id !== "gastosFijos").map(category => (
                <label key={category.id}>
                  <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>{category.name}</div>
                  <input className="inp" type="number" step="any" value={baseDraft[category.id]} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editBaseDraft(category.id,event.target.value)} />
                </label>
              ))}
            </div>

            <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${palette.line}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <span style={{ fontSize:13, color:palette.ink }}>Gastos fijos (desglose)</span>
                <span className="num" style={{ fontSize:16, fontWeight:600, color:palette.ink }}>{formatEuroWithCents(draftFixedExpensesTotal)}</span>
              </div>
              {baseDraft.fixedExpenseItems.map(item => (
                <div key={item.id} className="gf-row" style={{ marginBottom:8 }}>
                  <input className="inp" value={item.name} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editFixedExpense(item.id,"name",event.target.value)} style={{fontFamily:"'DM Sans',sans-serif"}} />
                  <input className="inp" type="number" step="any" value={item.amount} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editFixedExpense(item.id,"amount",event.target.value)} />
                  <button className="seg" onClick={()=>removeFixedExpense(item.id)} style={{ color:palette.bad }}>✕</button>
                </div>
              ))}
              <div className="gf-row" style={{ marginTop:10 }}>
                <input className="inp" placeholder="Nuevo gasto fijo (ej. alquiler, seguro...)" value={newFixedExpense.name} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setNewFixedExpense(previous=>({...previous,name:event.target.value}))} style={{fontFamily:"'DM Sans',sans-serif"}} />
                <input className="inp" type="number" step="any" placeholder="Importe" value={newFixedExpense.amount} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setNewFixedExpense(previous=>({...previous,amount:event.target.value}))} />
                <button className="seg on" onClick={addFixedExpense}>+ Añadir</button>
              </div>
              <div style={{ fontSize:11.5, color:palette.faint, marginTop:10 }}>El total de estas partidas es el número de &quot;Gastos fijos&quot; que se usa en toda la pestaña de Presupuesto.</div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginTop:16, paddingTop:16, borderTop:`1px solid ${palette.line}` }}>
              <div className="num" style={{ fontSize:12.5 }}>
                <span style={{ color:palette.sub }}>Sin asignar: </span>
                <span style={{ color: Math.abs(draftUnassigned) < 5 ? palette.acc : palette.warn, fontWeight:600 }}>{formatEuroWithCents(draftUnassigned)}</span>
                <span style={{ color:palette.faint }}> {Math.abs(draftUnassigned) < 5 ? "(cuadra con el ingreso neto)" : "(revisa: no cuadra con el ingreso neto)"}</span>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="seg" onClick={cancelBaseEditing}>Cancelar</button>
                <button className="seg on" onClick={saveBase}>Guardar cambios</button>
              </div>
            </div>
          </div>
        )}
      </div>

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

      <div className="card span-2">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <button className="eyebrow" onClick={()=>setBreakdownOpen(previous=>!previous)} style={{ background:"none", border:"none", padding:0, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ display:"inline-block", transition:".15s", transform: breakdownOpen?"rotate(90deg)":"rotate(0deg)" }}>▸</span>
            {month.label} · desglose
          </button>
          <div className="num" style={{ fontSize:12.5 }}>
            <span style={{ color:palette.sub }}>Sobrante (guardado): </span>
            <span style={{ color: result.surplus >= 0 ? palette.acc : palette.bad, fontWeight:600 }}>{formatEuroWithCents(result.surplus)}</span>
          </div>
        </div>

        {breakdownOpen && (
        <div style={{ marginTop:16 }}>
        <label style={{ display:"block", marginBottom:16 }}>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Ingreso neto este mes {draft.netIncomeOverride==null && <span style={{color:palette.faint}}>(base: {formatEuro(baseBudget.ingresoNeto)})</span>}</div>
          <input className="inp" type="number" step="any" placeholder={String(baseBudget.ingresoNeto)} value={draft.netIncomeOverride ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDraftIncomeOverride(event.target.value)} style={{ maxWidth:200 }} />
        </label>

        {CATEGORIES.map(category => {
          const categoryBase = baseBudget[category.id];
          const budgeted = draftResult.values[category.id];
          const actualValue = draftResult.actual[category.id];
          const isRegistered = actualValue != null;
          const delta = isRegistered ? actualValue - budgeted : 0;
          const isOnTrack = category.type === "ahorro" ? delta >= 0 : delta <= 0;
          return (
            <div key={category.id} style={{ marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${palette.line}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6, flexWrap:"wrap", gap:6 }}>
                <span style={{ fontSize:13, color:palette.ink }}>{category.name}</span>
                <span className="num" style={{ fontSize:12.5, color:palette.faint }}>base {formatEuro(categoryBase)}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <label>
                  <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Presupuestado (override mes)</div>
                  <input className="inp" type="number" step="any" placeholder={String(categoryBase)} value={draft.overrides?.[category.id] ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDraftOverride(category.id,event.target.value)} />
                </label>
                <label>
                  <div style={{ fontSize:10.5, color:palette.faint, marginBottom:2 }}>Real</div>
                  <input className="inp" type="number" step="any" placeholder="sin registrar" value={actualValue ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDraftActual(category.id,event.target.value)} />
                </label>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11.5 }} className="num">
                <span style={{ color:palette.sub }}>Total presupuestado: {formatEuroWithCents(budgeted)}</span>
                {isRegistered && <span style={{ color: isOnTrack ? palette.acc : palette.bad }}>{delta>=0?"+":""}{formatEuroWithCents(delta)} vs plan</span>}
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
              <span className="num" style={{ color:palette.warn }}>+{formatEuroWithCents(event.amount)}</span>
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

      <div className="card">
        <div className="eyebrow" style={{ marginBottom:14 }}>{month.label} · presupuestado vs real</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthChartData} margin={{ left:-16, right:8, top:6 }}>
            <CartesianGrid stroke={palette.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="name" stroke={palette.faint} tick={{ fontSize:10.5, fontFamily:"DM Mono" }} interval={0} />
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
          <LineChart data={annualEvolution} margin={{ left:-10, right:10, top:6 }}>
            <CartesianGrid stroke={palette.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="month" stroke={palette.faint} tick={{ fontSize:11.5, fontFamily:"DM Mono" }} />
            <YAxis stroke={palette.faint} tick={{ fontSize:12, fontFamily:"DM Mono" }} />
            <Tooltip formatter={(value)=>(value==null?"sin registrar":formatEuroWithCents(Number(value)))} cursor={{ stroke: palette.faint, strokeWidth: 1 }} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8}} labelStyle={{color:palette.sub}} itemStyle={{color:palette.ink}} />
            <Legend wrapperStyle={{ fontSize:12 }} />
            <Line type="monotone" dataKey="savingsBudgeted" name="Ahorro presupuestado" stroke="#7e9c8a" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="savingsActual" name="Ahorro real" stroke={palette.acc} strokeWidth={3} dot={{ r:4 }} connectNulls={false} />
            <Line type="monotone" dataKey="expenseBudgeted" name="Gasto presupuestado" stroke="#b0654f" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="expenseActual" name="Gasto real" stroke={palette.warn} strokeWidth={3} dot={{ r:4 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
