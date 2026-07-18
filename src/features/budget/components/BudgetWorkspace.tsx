"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { palette, seriesColorAt } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import { idGenerator } from "@/lib/IdGenerator";
import type { CategoryId, FixedExpenseItem, Month, Budget, BudgetDraft } from "@/features/budget/domain/types";
import { CATEGORIES } from "@/features/budget/domain/config";
import { monthFactory } from "@/features/budget/domain/MonthFactory";
import { BudgetMonthlyBreakdown } from "@/features/budget/components/BudgetMonthlyBreakdown";

export interface BudgetWorkspaceProps {
  baseBudget: Budget;
  setBaseBudget: React.Dispatch<React.SetStateAction<Budget | null>>;
  months: Month[];
  setMonths: React.Dispatch<React.SetStateAction<Month[]>>;
  fixedExpenseItems: FixedExpenseItem[];
  setFixedExpenseItems: React.Dispatch<React.SetStateAction<FixedExpenseItem[]>>;
}

type EditableBudgetField = "ingresoNeto" | CategoryId;
type EditableFixedExpenseField = "name" | "amount";

export function BudgetWorkspace({ baseBudget, setBaseBudget, months, setMonths, fixedExpenseItems, setFixedExpenseItems }: BudgetWorkspaceProps): React.JSX.Element {
  const [baseEditing, setBaseEditing] = useState<boolean>(false);
  const [baseSaved, setBaseSaved] = useState<boolean>(false);
  const [baseDraft, setBaseDraft] = useState<BudgetDraft>(() => ({ ...baseBudget, fixedExpenseItems }));
  const [newFixedExpense, setNewFixedExpense] = useState<{ name: string; amount: string }>({ name:"", amount:"" });

  const draftFixedExpensesTotal = baseDraft.fixedExpenseItems.reduce((sum,item)=>sum+(item.amount||0),0);

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
    setBaseDraft(draft => ({ ...draft, fixedExpenseItems: [...draft.fixedExpenseItems, { id: idGenerator.generate(), name: newFixedExpense.name, amount: parseFloat(newFixedExpense.amount) || 0 }] }));
    setNewFixedExpense({ name:"", amount:"" });
  };

  const registerCurrentMonth = (): void => setMonths(previousMonths => [...previousMonths, monthFactory.createCurrent()]);

  const baseTotal = CATEGORIES.reduce((sum,category)=>sum+baseBudget[category.id],0);
  const baseUnassigned = baseBudget.ingresoNeto - baseTotal;
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
                <Tooltip formatter={(value)=>currencyFormatter.euroWithCents(Number(value))} itemStyle={{color:palette.ink}} labelStyle={{color:palette.sub}} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8,color:palette.ink}} />
              </PieChart>
            </ResponsiveContainer>
            <div>
              <div style={{ marginBottom:14 }}>
                <div className="eyebrow" style={{ marginBottom:4 }}>Ingreso neto /mes</div>
                <div className="num disp" style={{ fontSize:28, fontWeight:600 }}>{currencyFormatter.euroWithCents(baseBudget.ingresoNeto)}</div>
              </div>
              {baseDonutData.map(slice => (
                <div key={slice.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, fontSize:13 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:8, color:palette.sub }}>
                    <span style={{ width:9, height:9, borderRadius:2, background:slice.color }} />
                    {slice.name}
                  </span>
                  <span className="num" style={{ color:palette.ink }}>{currencyFormatter.euroWithCents(slice.value)} <span style={{ color:palette.faint }}>({currencyFormatter.percent(baseBudget.ingresoNeto ? slice.value/baseBudget.ingresoNeto*100 : 0)})</span></span>
                </div>
              ))}
              <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${palette.line}`, fontSize:12.5 }} className="num">
                <span style={{ color:palette.sub }}>Sin asignar: </span>
                <span style={{ color: Math.abs(baseUnassigned) < 5 ? palette.acc : palette.warn, fontWeight:600 }}>{currencyFormatter.euroWithCents(baseUnassigned)}</span>
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
                <span className="num" style={{ fontSize:16, fontWeight:600, color:palette.ink }}>{currencyFormatter.euroWithCents(draftFixedExpensesTotal)}</span>
              </div>
              {baseDraft.fixedExpenseItems.map(item => (
                <div key={item.id} className="gf-row" style={{ marginBottom:8 }}>
                  <input className="inp" value={item.name} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editFixedExpense(item.id,"name",event.target.value)} style={{fontFamily:"'DM Sans',sans-serif"}} />
                  <input className="inp" type="number" step="any" value={item.amount} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editFixedExpense(item.id,"amount",event.target.value)} />
                  <button className="seg" onClick={()=>removeFixedExpense(item.id)} aria-label={`Eliminar ${item.name}`} style={{ color:palette.bad }}>✕</button>
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
                <span style={{ color: Math.abs(draftUnassigned) < 5 ? palette.acc : palette.warn, fontWeight:600 }}>{currencyFormatter.euroWithCents(draftUnassigned)}</span>
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

      {months.length === 0 ? (
        <div className="card span-full">
          <div className="eyebrow" style={{ marginBottom:8 }}>Registra tu primer mes</div>
          <p style={{ margin:"0 0 16px", fontSize:12.5, color:palette.sub, lineHeight:1.5 }}>
            Ya tienes un presupuesto base. Para ver el desglose mensual y comparar presupuestado vs real, registra el mes actual.
          </p>
          <button className="seg on" onClick={registerCurrentMonth}>Registrar mes actual</button>
        </div>
      ) : (
        <BudgetMonthlyBreakdown baseBudget={baseBudget} months={months} setMonths={setMonths} />
      )}
    </div>
  );
}
