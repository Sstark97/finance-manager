"use client";

import React, { useState } from "react";
import { palette } from "@/lib/theme";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import { GOALS_SETTINGS_INITIAL } from "@/features/goals/data/goalsSettings";

export interface GoalsSettingsOnboardingProps {
  onCreateSettings: (settings: GoalsSettings) => void;
}

export function GoalsSettingsOnboarding({ onCreateSettings }: GoalsSettingsOnboardingProps): React.JSX.Element {
  const [currentSalary, setCurrentSalary] = useState<number>(0);
  const [fiContribution, setFiContribution] = useState<number>(0);
  const [fiReturn, setFiReturn] = useState<number>(0);
  const [btcSavings, setBtcSavings] = useState<number>(0);
  const [disposable, setDisposable] = useState<boolean>(false);
  const [dcaActive, setDcaActive] = useState<boolean>(false);
  const [countCar, setCountCar] = useState<boolean>(false);

  const createSettings = (): void => {
    onCreateSettings({
      currentSalary, fiContribution, fiReturn, btcSavings,
      btcConditions: { disposable, dcaActive },
      countCar,
    });
  };

  return (
    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>
      <div className="card span-full">
        <div className="eyebrow" style={{ marginBottom:6 }}>Configura tus metas</div>
        <p style={{ margin:"0 0 16px", fontSize:12.5, color:palette.sub, lineHeight:1.5 }}>
          Aún no has guardado tu configuración de metas. Estos parámetros alimentan la proyección de
          libertad financiera y la operación Bitcoin. Los valores de ejemplo son solo una sugerencia,
          no se guardan hasta que confirmes.
        </p>

        <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", marginBottom:18 }}>
          <label>
            <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Salario bruto anual actual</div>
            <input className="inp" type="number" step="1000" placeholder={String(GOALS_SETTINGS_INITIAL.currentSalary)} value={currentSalary || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setCurrentSalary(parseFloat(event.target.value)||0)} />
          </label>
          <label>
            <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Aportación mensual (€)</div>
            <input className="inp" type="number" step="any" placeholder={String(GOALS_SETTINGS_INITIAL.fiContribution)} value={fiContribution || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setFiContribution(parseFloat(event.target.value)||0)} />
          </label>
          <label>
            <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Rentabilidad anual esperada</div>
            <input className="inp" type="number" step="0.01" placeholder={String(GOALS_SETTINGS_INITIAL.fiReturn)} value={fiReturn || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setFiReturn(parseFloat(event.target.value)||0)} />
          </label>
          <label>
            <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Ahorro para la operación Bitcoin (€)</div>
            <input className="inp" type="number" step="any" placeholder={String(GOALS_SETTINGS_INITIAL.btcSavings)} value={btcSavings || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setBtcSavings(parseFloat(event.target.value)||0)} />
          </label>
        </div>

        <label style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, fontSize:12.5, color:palette.sub }}>
          <input type="checkbox" checked={disposable} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setDisposable(event.target.checked)} /> Dinero prescindible para Bitcoin (no del fondo de emergencia)
        </label>
        <label style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, fontSize:12.5, color:palette.sub }}>
          <input type="checkbox" checked={dcaActive} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setDcaActive(event.target.checked)} /> El DCA mensual no se pausa
        </label>
        <label style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18, fontSize:12.5, color:palette.sub }}>
          <input type="checkbox" checked={countCar} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setCountCar(event.target.checked)} /> Contar el coche como activo (neutraliza su deuda)
        </label>

        <div style={{ display:"flex", justifyContent:"flex-end", paddingTop:16, borderTop:`1px solid ${palette.line}` }}>
          <button className="seg on" onClick={createSettings}>Crear mi configuración de metas</button>
        </div>
      </div>
    </div>
  );
}
