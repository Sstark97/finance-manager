"use client";

import React, { useState } from "react";
import { palette } from "@/lib/theme";
import { OnboardingCard } from "@/shared/ui/OnboardingCard";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import { WEALTH_TARGETS_INITIAL } from "@/features/wealth/data/wealthTargets";

export interface WealthTargetsOnboardingProps {
  onCreateTargets: (targets: WealthTargets) => void;
  className?: string;
}

export function WealthTargetsOnboarding({ onCreateTargets, className }: WealthTargetsOnboardingProps): React.JSX.Element {
  const [emergencyFund, setEmergencyFund] = useState<number>(0);
  const [minimumFund, setMinimumFund] = useState<number>(0);
  const [equityWorld, setEquityWorld] = useState<number>(0);
  const [equityEm, setEquityEm] = useState<number>(0);
  const [equityNasdaq, setEquityNasdaq] = useState<number>(0);
  const [btcPauseWeight, setBtcPauseWeight] = useState<number>(0);
  const [btcSellWeight, setBtcSellWeight] = useState<number>(0);
  const [btcPauseCapital, setBtcPauseCapital] = useState<number>(0);
  const [btcSellCapital, setBtcSellCapital] = useState<number>(0);

  const createTargets = (): void => {
    onCreateTargets({
      emergencyFund, minimumFund,
      equityTargets: { world: equityWorld, em: equityEm, nasdaq: equityNasdaq },
      btcPauseWeight, btcSellWeight, btcPauseCapital, btcSellCapital,
    });
  };

  return (
    <OnboardingCard
      className={className}
      title="Configura tus objetivos de patrimonio"
      description="Aún no has guardado tus objetivos de patrimonio. Estos parámetros alimentan el fondo de emergencia, la distribución objetivo de renta variable y las reglas de Bitcoin. Los valores de ejemplo son solo una sugerencia, no se guardan hasta que confirmes."
      ctaLabel="Crear mis objetivos"
      onConfirm={createTargets}
    >
      <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", marginBottom:18 }}>
        <label>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Fondo de emergencia objetivo (€)</div>
          <input className="inp" type="number" step="any" placeholder={String(WEALTH_TARGETS_INITIAL.emergencyFund)} value={emergencyFund || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setEmergencyFund(parseFloat(event.target.value)||0)} />
        </label>
        <label>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Fondo de emergencia mínimo (€)</div>
          <input className="inp" type="number" step="any" placeholder={String(WEALTH_TARGETS_INITIAL.minimumFund)} value={minimumFund || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setMinimumFund(parseFloat(event.target.value)||0)} />
        </label>
        <label>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Objetivo RV World (%)</div>
          <input className="inp" type="number" step="any" placeholder={String(WEALTH_TARGETS_INITIAL.equityTargets.world)} value={equityWorld || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setEquityWorld(parseFloat(event.target.value)||0)} />
        </label>
        <label>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Objetivo RV Emergentes (%)</div>
          <input className="inp" type="number" step="any" placeholder={String(WEALTH_TARGETS_INITIAL.equityTargets.em)} value={equityEm || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setEquityEm(parseFloat(event.target.value)||0)} />
        </label>
        <label>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Objetivo RV Nasdaq (%)</div>
          <input className="inp" type="number" step="any" placeholder={String(WEALTH_TARGETS_INITIAL.equityTargets.nasdaq)} value={equityNasdaq || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setEquityNasdaq(parseFloat(event.target.value)||0)} />
        </label>
        <label>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Peso BTC para pausar aportaciones (%)</div>
          <input className="inp" type="number" step="any" placeholder={String(WEALTH_TARGETS_INITIAL.btcPauseWeight)} value={btcPauseWeight || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setBtcPauseWeight(parseFloat(event.target.value)||0)} />
        </label>
        <label>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Peso BTC para venta parcial (%)</div>
          <input className="inp" type="number" step="any" placeholder={String(WEALTH_TARGETS_INITIAL.btcSellWeight)} value={btcSellWeight || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setBtcSellWeight(parseFloat(event.target.value)||0)} />
        </label>
        <label>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Capital cartera para pausar BTC (€)</div>
          <input className="inp" type="number" step="any" placeholder={String(WEALTH_TARGETS_INITIAL.btcPauseCapital)} value={btcPauseCapital || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setBtcPauseCapital(parseFloat(event.target.value)||0)} />
        </label>
        <label>
          <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Capital cartera para vender BTC (€)</div>
          <input className="inp" type="number" step="any" placeholder={String(WEALTH_TARGETS_INITIAL.btcSellCapital)} value={btcSellCapital || ""} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setBtcSellCapital(parseFloat(event.target.value)||0)} />
        </label>
      </div>
    </OnboardingCard>
  );
}
