"use client";

import React, { useState } from "react";
import { palette } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import { idGenerator } from "@/lib/IdGenerator";
import { OnboardingCard } from "@/shared/ui/OnboardingCard";
import type { CategoryId, FixedExpenseItem, Budget, BudgetDraft } from "@/features/budget/domain/types";
import { CATEGORIES } from "@/features/budget/domain/config";

export interface BudgetOnboardingProps {
  onCreateBudget: (budget: Budget, fixedExpenseItems: FixedExpenseItem[]) => void;
}

type EditableBudgetField = "ingresoNeto" | CategoryId;
type EditableFixedExpenseField = "name" | "amount";

const BLANK_BUDGET_DRAFT: BudgetDraft = {
  ingresoNeto: 0, gastosFijos: 0, inversion: 0, fondoEmergencia: 0, ocio: 0, caprichos: 0, fixedExpenseItems: [],
};

export function BudgetOnboarding({ onCreateBudget }: BudgetOnboardingProps): React.JSX.Element {
  const [draft, setDraft] = useState<BudgetDraft>(BLANK_BUDGET_DRAFT);
  const [newFixedExpense, setNewFixedExpense] = useState<{ name: string; amount: string }>({ name:"", amount:"" });

  const fixedExpensesTotal = draft.fixedExpenseItems.reduce((sum,item)=>sum+(item.amount||0),0);
  const unassigned = draft.ingresoNeto - (fixedExpensesTotal + draft.inversion + draft.fondoEmergencia + draft.ocio + draft.caprichos);

  const editDraft = (field: EditableBudgetField, value: string): void => setDraft(previous => ({ ...previous, [field]: parseFloat(value) || 0 }));
  const editFixedExpense = (id: string, field: EditableFixedExpenseField, value: string): void => setDraft(previous => ({
    ...previous, fixedExpenseItems: previous.fixedExpenseItems.map(item => item.id !== id ? item : { ...item, [field]: field === "amount" ? (parseFloat(value) || 0) : value } as FixedExpenseItem)
  }));
  const removeFixedExpense = (id: string): void => setDraft(previous => ({ ...previous, fixedExpenseItems: previous.fixedExpenseItems.filter(item => item.id !== id) }));
  const addFixedExpense = (): void => {
    if (!newFixedExpense.name || !newFixedExpense.amount) return;
    setDraft(previous => ({ ...previous, fixedExpenseItems: [...previous.fixedExpenseItems, { id: idGenerator.generate(), name: newFixedExpense.name, amount: parseFloat(newFixedExpense.amount) || 0 }] }));
    setNewFixedExpense({ name:"", amount:"" });
  };

  const createBudget = (): void => {
    onCreateBudget({
      ingresoNeto: draft.ingresoNeto,
      gastosFijos: fixedExpensesTotal,
      inversion: draft.inversion,
      fondoEmergencia: draft.fondoEmergencia,
      ocio: draft.ocio,
      caprichos: draft.caprichos,
    }, draft.fixedExpenseItems);
  };

  const unassignedFooter = (
    <div className="num" style={{ fontSize:12.5 }}>
      <span style={{ color:palette.sub }}>Sin asignar: </span>
      <span style={{ color: Math.abs(unassigned) < 5 ? palette.acc : palette.warn, fontWeight:600 }}>{currencyFormatter.euroWithCents(unassigned)}</span>
      <span style={{ color:palette.faint }}> {Math.abs(unassigned) < 5 ? "(cuadra con el ingreso neto)" : "(revisa: no cuadra con el ingreso neto)"}</span>
    </div>
  );

  return (
    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>
      <OnboardingCard
        title="Configura tu presupuesto"
        description="Aún no tienes un presupuesto guardado. Define tu ingreso neto mensual y el reparto por categorías: será tu plantilla base para cada mes. Al guardar se crea también el mes actual para que empieces a registrar tus gastos reales."
        ctaLabel="Crear mi presupuesto"
        onConfirm={createBudget}
        footer={unassignedFooter}
      >
        <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))" }}>
          <label>
            <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Ingreso neto /mes</div>
            <input className="inp" type="number" step="any" value={draft.ingresoNeto} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDraft("ingresoNeto",event.target.value)} />
          </label>
          {CATEGORIES.filter(category => category.id !== "gastosFijos").map(category => (
            <label key={category.id}>
              <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>{category.name}</div>
              <input className="inp" type="number" step="any" value={draft[category.id]} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>editDraft(category.id,event.target.value)} />
            </label>
          ))}
        </div>

        <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${palette.line}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <span style={{ fontSize:13, color:palette.ink }}>Gastos fijos (desglose)</span>
            <span className="num" style={{ fontSize:16, fontWeight:600, color:palette.ink }}>{currencyFormatter.euroWithCents(fixedExpensesTotal)}</span>
          </div>
          {draft.fixedExpenseItems.map(item => (
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
          <div style={{ fontSize:11.5, color:palette.faint, marginTop:10 }}>El total de estas partidas será el número de &quot;Gastos fijos&quot; que se usa en toda la pestaña de Presupuesto.</div>
        </div>
      </OnboardingCard>
    </div>
  );
}
