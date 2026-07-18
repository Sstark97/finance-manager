"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { palette, seriesColorAt } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import { idGenerator } from "@/lib/IdGenerator";
import type { Position, PositionType, CompositionItem, EquityIndexKey } from "@/features/wealth/domain/types";
import { COMPOSITIONS } from "@/features/wealth/domain/config";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import type { PortfolioDerived } from "@/features/wealth/domain/PortfolioCalculator";
import { wealthThresholdEvaluator } from "@/features/wealth/domain/WealthThresholdEvaluator";
import type { PositionPricingResult } from "@/features/wealth/application/RefreshPositionPrices";
import type { Debt } from "@/shared/domain/types";
import { DebtLedger } from "@/shared/domain/DebtLedger";
import { Metric } from "@/shared/ui/Metric";
import { WealthTargetsOnboarding } from "@/features/wealth/components/WealthTargetsOnboarding";
import { WealthEvolutionChart, type WealthEvolutionSummary } from "@/features/wealth/components/WealthEvolutionChart";

interface Alert {
  kind: "good" | "warn" | "bad";
  message: string;
}

type CompositionView = "countries" | "sectors";

export interface WealthTabProps {
  portfolio: Position[];
  setPortfolio: React.Dispatch<React.SetStateAction<Position[]>>;
  portfolioDerived: PortfolioDerived;
  debts: Debt[];
  wealthTargets: WealthTargets | null;
  setWealthTargets: React.Dispatch<React.SetStateAction<WealthTargets | null>>;
}

type EditablePositionField = "name" | "type" | "ticker" | "units" | "price";

const EQUITY_INDEX_LABEL: Record<EquityIndexKey, string> = { world: "World", em: "Emergentes", nasdaq: "Nasdaq" };
const EQUITY_INDEX_OPTIONS: EquityIndexKey[] = ["world", "em", "nasdaq"];

const PRICE_POLL_INTERVAL_MS = 15 * 60 * 1000;

export function WealthTab({ portfolio, setPortfolio, portfolioDerived, debts, wealthTargets, setWealthTargets }: WealthTabProps): React.JSX.Element {
  const [stagflation, setStagflation] = useState<boolean>(true);
  const [editing, setEditing] = useState<boolean>(false);
  const [editingTargets, setEditingTargets] = useState<boolean>(false);
  const [drilldown, setDrilldown] = useState<EquityIndexKey>("world");
  const [view, setView] = useState<CompositionView>("countries");
  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);
  const [priceRefreshWarning, setPriceRefreshWarning] = useState<string | null>(null);
  const [evolutionSummary, setEvolutionSummary] = useState<WealthEvolutionSummary>({ change: 0, changePercent: 0 });

  const { total, invested, liquidityTotal, equity, btcTotal, btcWeightTotal, equityWeightOf, withValue } = portfolioDerived;
  const { change, changePercent } = evolutionSummary;

  const totalDebt = new DebtLedger(debts).totalActiveBalance();
  const netWorth = total - totalDebt;

  const thresholdStatus = wealthTargets == null ? null : wealthThresholdEvaluator.evaluate(portfolioDerived, wealthTargets);

  const alerts: Alert[] = wealthTargets == null || thresholdStatus == null ? [] : ((targets: WealthTargets): Alert[] => {
    const list: Alert[] = [];
    if (thresholdStatus.isEmergencyFundBelowMinimum)
      list.push({ kind:"warn", message:`Fondo de emergencia por debajo del mínimo de ${currencyFormatter.euro(targets.minimumFund)}. Es la prioridad.` });
    if (thresholdStatus.isBitcoinAtSellThreshold)
      list.push({ kind:"bad", message:`BTC supera el ${targets.btcSellWeight}% con cartera >${currencyFormatter.euro(targets.btcSellCapital)}: toca venta parcial hasta el 30%.` });
    else if (thresholdStatus.isBitcoinAtPauseThreshold)
      list.push({ kind:"warn", message:`BTC supera el ${targets.btcPauseWeight}% con cartera >${currencyFormatter.euro(targets.btcPauseCapital)}: pausar aportaciones de BTC.` });
    if (thresholdStatus.isWorldWeightDeviated) list.push({ kind:"warn", message:`World desviado ${thresholdStatus.worldWeightDeviation.toFixed(0)} pts del objetivo ${targets.equityTargets.world}%. El DCA lo corrige.` });
    if (thresholdStatus.isEmergencyFundComplete)
      list.push({ kind:"good", message:`Fondo de emergencia completo (${currencyFormatter.euro(targets.emergencyFund)}). Replantea virar a inversión.` });
    if (list.length === 0) list.push({ kind:"good", message:"Todo dentro de plan. Sigue con el DCA." });
    return list;
  })(wealthTargets);

  const score: { total: number; breakdown: Array<[string, number]> } | null = wealthTargets == null ? null : ((targets: WealthTargets): { total: number; breakdown: Array<[string, number]> } => {
    let sum = 0; const breakdown: Array<[string, number]> = [];
    sum += 10*0.15; breakdown.push(["Estructura y fiscalidad", 10]);
    sum += 10*0.10; breakdown.push(["Costes (TER bajos)", 10]);
    const equityWeightDeviation = (Math.abs(equityWeightOf("world")-targets.equityTargets.world)+Math.abs(equityWeightOf("em")-targets.equityTargets.em)+Math.abs(equityWeightOf("nasdaq")-targets.equityTargets.nasdaq))/3;
    const diversification = equity ? Math.max(4, 10 - equityWeightDeviation/2) : 6;
    sum += diversification*0.20; breakdown.push(["Diversificación RV", diversification]);
    const fundRatio = Math.min(1, liquidityTotal / targets.emergencyFund);
    const cushion = 2 + fundRatio*8; sum += cushion*0.30; breakdown.push(["Colchón de emergencia", cushion]);
    const btcSafe = btcWeightTotal <= 20 ? 10 : Math.max(3, 10-(btcWeightTotal-20)/3);
    sum += btcSafe*0.10; breakdown.push(["Riesgo Bitcoin", btcSafe]);
    const size = Math.min(10, 3 + total/8000); sum += size*0.15; breakdown.push(["Tamaño de cartera", size]);
    return { total: sum, breakdown };
  })(wealthTargets);

  const portfolioPie = withValue
    .map((position, index) => ({ name: position.name, value: position.value, color: seriesColorAt(index) }))
    .filter((slice) => slice.value > 0);

  const compositionKeys = EQUITY_INDEX_OPTIONS.filter(key => portfolio.some(position => position.equityIndex === key));
  const activeDrilldown: EquityIndexKey | undefined = compositionKeys.includes(drilldown) ? drilldown : compositionKeys[0];
  const composition = activeDrilldown ? COMPOSITIONS[activeDrilldown] : undefined;
  const compositionData: CompositionItem[] = composition ? (view === "countries" ? composition.countries : composition.sectors) : [];

  const editPosition = (id: string, field: EditablePositionField, value: string): void => setPortfolio(positions => positions.map(position => {
    if (position.id !== id) return position;
    const updatedValue = (field === "units" || field === "price") ? (parseFloat(value) || 0) : value;
    const updatedPosition = { ...position, [field]: updatedValue } as Position;
    if (field === "type" && (value === "cripto" || value === "efectivo")) updatedPosition.equityIndex = null;
    return updatedPosition;
  }));
  const setPositionEquityIndex = (id: string, value: string): void => setPortfolio(positions => positions.map(position => position.id === id
    ? { ...position, equityIndex: value === "" ? null : (value as EquityIndexKey) }
    : position));
  const removePosition = (id: string): void => setPortfolio(positions => positions.filter(position => position.id !== id));
  const addPosition = (type: PositionType): void => setPortfolio(positions => [...positions, {
    id: idGenerator.generate(), name: type === "efectivo" ? "Nuevo efectivo" : "Nueva posición",
    ticker: "", type, units: 0, price: type === "efectivo" ? 1 : 0,
    group: type === "cripto" ? "btc" : type === "efectivo" ? "liquidez" : "rv",
    equityIndex: null,
  }]);

  const portfolioRef = useRef(portfolio);
  useEffect(() => { portfolioRef.current = portfolio; }, [portfolio]);

  const refreshPrices = useCallback(async (): Promise<void> => {
    setLoadingPrices(true);
    setPriceRefreshWarning(null);
    try {
      const response = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: portfolioRef.current }),
      });
      if (!response.ok) throw new Error("El backend de precios no respondió correctamente");
      const result = (await response.json()) as PositionPricingResult;
      setPortfolio(result.positions);
      setPriceRefreshWarning(result.failedTickers.length > 0
        ? `No se pudieron actualizar: ${result.failedTickers.join(", ")}. Edita el precio a mano.`
        : null);
    } catch {
      setPriceRefreshWarning("No se pudo conectar con el backend de precios. Mientras, edita el precio a mano.");
    } finally { setLoadingPrices(false); }
  }, [setPortfolio]);

  useEffect(() => {
    const initialFetchId = setTimeout(refreshPrices, 0);
    const intervalId = setInterval(refreshPrices, PRICE_POLL_INTERVAL_MS);
    return () => { clearTimeout(initialFetchId); clearInterval(intervalId); };
  }, [refreshPrices]);

  const scoreColor = score == null ? palette.faint : score.total >= 8 ? palette.acc : score.total >= 6 ? palette.warn : palette.bad;
  const POSITION_TYPE_LABEL: Record<PositionType, string> = { fondo:"Fondo", etf:"ETF", cripto:"Cripto", efectivo:"Efectivo" };
  const availableTypes: PositionType[] = ["fondo","etf","cripto","efectivo"];
  const equityRows: Array<[EquityIndexKey, string, number]> = wealthTargets == null ? [] : [
    ["world","World",wealthTargets.equityTargets.world],
    ["em","Emergentes",wealthTargets.equityTargets.em],
    ["nasdaq","Nasdaq",wealthTargets.equityTargets.nasdaq],
  ];

  const updateWealthTargets = (updater: (targets: WealthTargets) => WealthTargets): void =>
    setWealthTargets(previous => (previous ? updater(previous) : previous));
  const setEmergencyFund = (value: number): void => updateWealthTargets(targets => ({ ...targets, emergencyFund: value }));
  const setMinimumFund = (value: number): void => updateWealthTargets(targets => ({ ...targets, minimumFund: value }));
  const setEquityTarget = (key: keyof WealthTargets["equityTargets"], value: number): void =>
    updateWealthTargets(targets => ({ ...targets, equityTargets: { ...targets.equityTargets, [key]: value } }));
  const setBtcPauseWeight = (value: number): void => updateWealthTargets(targets => ({ ...targets, btcPauseWeight: value }));
  const setBtcSellWeight = (value: number): void => updateWealthTargets(targets => ({ ...targets, btcSellWeight: value }));
  const setBtcPauseCapital = (value: number): void => updateWealthTargets(targets => ({ ...targets, btcPauseCapital: value }));
  const setBtcSellCapital = (value: number): void => updateWealthTargets(targets => ({ ...targets, btcSellCapital: value }));

  return (
    <>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:8, justifyContent:"flex-start" }}>
        <button className="seg" onClick={refreshPrices} disabled={loadingPrices}>{loadingPrices ? "Actualizando…" : "↻ Actualizar precios"}</button>
        <button className="seg on" onClick={() => setEditing(previous => !previous)}>{editing ? "Cerrar edición" : "Editar cartera"}</button>
        {wealthTargets != null && (
          <button className="seg" onClick={() => setEditingTargets(previous => !previous)}>{editingTargets ? "Cerrar edición" : "Editar objetivos"}</button>
        )}
      </div>
      {priceRefreshWarning && (
        <div style={{ marginBottom:16, fontSize:12.5, color:palette.warn }}>{priceRefreshWarning}</div>
      )}

      {portfolio.length === 0 && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="eyebrow" style={{ marginBottom:6 }}>Aún no tienes posiciones</div>
          <p style={{ margin:0, fontSize:12.5, color:palette.sub, lineHeight:1.5 }}>
            Añade tu primera posición (fondo, ETF, cripto o efectivo) para empezar a ver aquí tu patrimonio,
            su distribución y su evolución. Pulsa <strong style={{color:palette.ink}}>&quot;Editar cartera&quot;</strong> arriba.
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:20 }}>
        <div>
          <div className="num disp" style={{ fontSize:"clamp(40px,9vw,68px)", fontWeight:600, lineHeight:1 }}>{currencyFormatter.euroWithCents(total)}</div>
          <div style={{ marginTop:10, fontSize:15 }} className="num">
            <span style={{ color: change>=0 ? palette.acc : palette.bad }}>{change>=0?"▲":"▼"} {currencyFormatter.euroWithCents(Math.abs(change))} ({changePercent>=0?"+":""}{changePercent.toFixed(2)}%)</span>
            <span style={{ color:palette.faint }}> en el rango seleccionado</span>
          </div>
          <div style={{ marginTop:6, fontSize:12.5 }} className="num">
            <span style={{ color:palette.sub }}>Patrimonio neto (activos − deudas): </span>
            <span style={{ color: netWorth>=0?palette.acc:palette.bad, fontWeight:600 }}>{currencyFormatter.euroWithCents(netWorth)}</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
          <Metric label="Invertido" value={currencyFormatter.euro(invested)} sub={`${currencyFormatter.percent(total?invested/total*100:0)} del total`} />
          <Metric
            label="Liquidez"
            value={currencyFormatter.euro(liquidityTotal)}
            sub={thresholdStatus?.isEmergencyFundBelowMinimum ? "por debajo del mínimo" : `${currencyFormatter.percent(total?liquidityTotal/total*100:0)} del total`}
            valueColor={thresholdStatus?.isEmergencyFundBelowMinimum ? palette.bad : undefined}
          />
          <Metric
            label="Bitcoin"
            value={currencyFormatter.euro(btcTotal)}
            sub={thresholdStatus?.isBitcoinAtSellThreshold ? "supera el umbral de venta" : thresholdStatus?.isBitcoinAtPauseThreshold ? "supera el umbral de pausa" : `${currencyFormatter.percent(btcWeightTotal)} del total`}
            valueColor={thresholdStatus?.isBitcoinAtSellThreshold ? palette.bad : thresholdStatus?.isBitcoinAtPauseThreshold ? palette.warn : undefined}
          />
        </div>
      </div>

      {editing && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="eyebrow" style={{ marginBottom:6 }}>Editar cartera</div>
          <p style={{ margin:"0 0 16px", fontSize:12.5, color:palette.sub, lineHeight:1.5 }}>
            Cada posición: <strong style={{color:palette.ink}}>nombre, ticker de Yahoo y participaciones</strong>. El precio lo trae Yahoo por su ticker (botón ↻).
            En efectivo introduces el saldo en €. Añade, edita o borra posiciones cuando rebalancees.
          </p>
          <div className="grid">
            {portfolio.map((position) => (
              <div key={position.id} className="poscard">
                <div className="posrow">
                  <label>
                    <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Nombre</div>
                    <input className="inp" value={position.name} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editPosition(position.id,"name",event.target.value)} style={{fontFamily:"'DM Sans',sans-serif"}} />
                  </label>
                  <label>
                    <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Tipo</div>
                    <select className="inp" value={position.type} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => editPosition(position.id,"type",event.target.value)}>
                      {availableTypes.map(type => <option key={type} value={type}>{POSITION_TYPE_LABEL[type]}</option>)}
                    </select>
                  </label>
                  {position.type === "efectivo" ? (
                    <label style={{ gridColumn:"span 2" }}>
                      <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Saldo €</div>
                      <input className="inp" type="number" step="any" value={position.units} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editPosition(position.id,"units",event.target.value)} />
                    </label>
                  ) : (
                    <>
                      <label>
                        <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Ticker Yahoo</div>
                        <input className="inp" value={position.ticker} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editPosition(position.id,"ticker",event.target.value)} placeholder="ej. CNDX.L" />
                      </label>
                      <label>
                        <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>{position.type==="cripto"?"Cantidad":"Particip."}</div>
                        <input className="inp" type="number" step="any" value={position.units} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editPosition(position.id,"units",event.target.value)} />
                      </label>
                    </>
                  )}
                  <button className="seg" onClick={() => removePosition(position.id)} title="Borrar posición" aria-label={`Borrar posición ${position.name}`} style={{ color:palette.bad, height:38 }}>✕</button>
                </div>
                {position.type !== "efectivo" && (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:10, paddingTop:10, borderTop:`1px solid ${palette.line}`, flexWrap:"wrap", gap:8 }}>
                    <label style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:palette.faint }}>Precio (Yahoo / manual)</span>
                      <input className="inp" type="number" step="any" value={position.price} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editPosition(position.id,"price",event.target.value)} style={{ width:120 }} />
                    </label>
                    <span className="num" style={{ fontSize:15, fontWeight:600, color:palette.acc }}>= {currencyFormatter.euroWithCents((position.units||0)*(position.price||0))}</span>
                  </div>
                )}
                {(position.type === "fondo" || position.type === "etf") && (
                  <label style={{ display:"block", marginTop:10 }}>
                    <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Índice</div>
                    <select className="inp" value={position.equityIndex ?? ""} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setPositionEquityIndex(position.id,event.target.value)}>
                      <option value="">Ninguno</option>
                      {EQUITY_INDEX_OPTIONS.map(key => <option key={key} value={key}>{EQUITY_INDEX_LABEL[key]}</option>)}
                    </select>
                  </label>
                )}
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
            <button className="seg" onClick={() => addPosition("fondo")}>+ Fondo</button>
            <button className="seg" onClick={() => addPosition("etf")}>+ ETF</button>
            <button className="seg" onClick={() => addPosition("cripto")}>+ Cripto</button>
            <button className="seg" onClick={() => addPosition("efectivo")}>+ Efectivo</button>
          </div>
        </div>
      )}

      {editingTargets && wealthTargets != null && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="eyebrow" style={{ marginBottom:6 }}>Editar objetivos</div>
          <p style={{ margin:"0 0 16px", fontSize:12.5, color:palette.sub, lineHeight:1.5 }}>
            Ajusta tu fondo de emergencia objetivo/mínimo, la distribución objetivo de renta variable y los umbrales de Bitcoin.
          </p>
          <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))" }}>
            <label>
              <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Fondo de emergencia objetivo (€)</div>
              <input className="inp" type="number" step="any" value={wealthTargets.emergencyFund} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmergencyFund(parseFloat(event.target.value)||0)} />
            </label>
            <label>
              <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Fondo de emergencia mínimo (€)</div>
              <input className="inp" type="number" step="any" value={wealthTargets.minimumFund} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMinimumFund(parseFloat(event.target.value)||0)} />
            </label>
            <label>
              <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Objetivo RV World (%)</div>
              <input className="inp" type="number" step="any" value={wealthTargets.equityTargets.world} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEquityTarget("world", parseFloat(event.target.value)||0)} />
            </label>
            <label>
              <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Objetivo RV Emergentes (%)</div>
              <input className="inp" type="number" step="any" value={wealthTargets.equityTargets.em} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEquityTarget("em", parseFloat(event.target.value)||0)} />
            </label>
            <label>
              <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Objetivo RV Nasdaq (%)</div>
              <input className="inp" type="number" step="any" value={wealthTargets.equityTargets.nasdaq} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEquityTarget("nasdaq", parseFloat(event.target.value)||0)} />
            </label>
            <label>
              <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Peso BTC para pausar aportaciones (%)</div>
              <input className="inp" type="number" step="any" value={wealthTargets.btcPauseWeight} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setBtcPauseWeight(parseFloat(event.target.value)||0)} />
            </label>
            <label>
              <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Peso BTC para venta parcial (%)</div>
              <input className="inp" type="number" step="any" value={wealthTargets.btcSellWeight} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setBtcSellWeight(parseFloat(event.target.value)||0)} />
            </label>
            <label>
              <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Capital cartera para pausar BTC (€)</div>
              <input className="inp" type="number" step="any" value={wealthTargets.btcPauseCapital} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setBtcPauseCapital(parseFloat(event.target.value)||0)} />
            </label>
            <label>
              <div style={{ fontSize:11, color:palette.sub, marginBottom:3 }}>Capital cartera para vender BTC (€)</div>
              <input className="inp" type="number" step="any" value={wealthTargets.btcSellCapital} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setBtcSellCapital(parseFloat(event.target.value)||0)} />
            </label>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>

        {wealthTargets == null && <WealthTargetsOnboarding className="widget-onboarding-cta" onCreateTargets={setWealthTargets} />}

        <div className="card">
          <div className="eyebrow" style={{ marginBottom:16 }}>Nota de la cartera</div>
          {score == null ? (
            <div style={{ fontSize:12.5, color:palette.faint, lineHeight:1.5 }}>
              Configura tus objetivos de patrimonio para ver tu nota de cartera.
            </div>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"baseline", gap:12, marginBottom:18 }}>
                <span className="num disp" style={{ fontSize:56, fontWeight:600, color:scoreColor, lineHeight:1 }}>{score.total.toFixed(1)}</span>
                <span className="num" style={{ fontSize:20, color:palette.faint }}>/ 10</span>
              </div>
              {score.breakdown.map(([name,value]) => (
                <div key={name} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:4 }}>
                    <span style={{ color:palette.sub }}>{name}</span><span className="num" style={{ color:palette.ink }}>{value.toFixed(1)}</span>
                  </div>
                  <div className="barra"><div className="barra-fill" style={{ width:`${value*10}%`, background: value>=8?palette.acc:value>=6?palette.warn:palette.bad }} /></div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card widget-wealth-distribution">
          <div className="eyebrow" style={{ marginBottom:8 }}>Distribución del patrimonio</div>
          {portfolioPie.length === 0 ? (
            <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"0 16px", color:palette.faint, fontSize:12.5, lineHeight:1.5 }}>
              Sin posiciones todavía. La distribución aparecerá aquí en cuanto añadas tu primera posición.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={portfolioPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2} stroke="none">
                    {portfolioPie.map((slice,sliceIndex) => <Cell key={sliceIndex} fill={slice.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => currencyFormatter.euroWithCents(Number(value))} itemStyle={{color:palette.ink}} labelStyle={{color:palette.sub}} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8,color:palette.ink}} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginTop:8 }}>
                {portfolioPie.map((slice) => (
                  <span key={slice.name} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:palette.sub }}>
                    <span style={{ width:9, height:9, borderRadius:2, background:slice.color }} />
                    {slice.name} <span className="num" style={{ color:palette.ink }}>{currencyFormatter.percent(total?slice.value/total*100:0)}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom:16 }}>Estado del plan</div>
          {wealthTargets == null ? (
            <div style={{ fontSize:12.5, color:palette.faint, lineHeight:1.5 }}>
              Configura tus objetivos de patrimonio para ver el estado de tu plan.
            </div>
          ) : (
            <>
              {alerts.map((alertItem,alertIndex) => (
                <div key={alertIndex} style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
                  <span style={{ marginTop:2, width:8, height:8, borderRadius:"50%", flexShrink:0, background: alertItem.kind==="good"?palette.acc:alertItem.kind==="warn"?palette.warn:palette.bad }} />
                  <span style={{ fontSize:13, lineHeight:1.5, color: alertItem.kind==="good"?palette.sub:palette.ink }}>{alertItem.message}</span>
                </div>
              ))}
              <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${palette.line}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, color:palette.sub, marginBottom:6 }}>
                  <span>Reglas BTC (por peso)</span><span className="num">{currencyFormatter.percent(btcWeightTotal)} actual</span>
                </div>
                <div style={{ fontSize:11.5, color:palette.faint, lineHeight:1.6 }}>
                  Pausar si &gt;{wealthTargets.btcPauseWeight}% y cartera &gt;{wealthTargets.btcPauseCapital/1000}k · Vender si &gt;{wealthTargets.btcSellWeight}% y cartera &gt;{wealthTargets.btcSellCapital/1000}k
                </div>
              </div>
            </>
          )}
        </div>

        <div className="card span-full">
          <div className="eyebrow" style={{ marginBottom:16 }}>Renta variable · real vs objetivo {stagflation && <span style={{color:palette.warn}}>· estanflación</span>}</div>
          {wealthTargets == null ? (
            <div style={{ fontSize:12.5, color:palette.faint, lineHeight:1.5 }}>
              Configura tus objetivos de patrimonio para ver la renta variable real frente al objetivo.
            </div>
          ) : (
            <>
              {equityRows.map(([key,label,target]) => {
                const exists = portfolio.some(position => position.equityIndex === key);
                const weight = equityWeightOf(key);
                return (
                  <div key={key} style={{ marginBottom:16, opacity: exists?1:.4 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5 }}>
                      <span style={{ color:palette.ink }}>{label}</span>
                      <span className="num"><span style={{color:palette.ink}}>{currencyFormatter.percent(weight)}</span> <span style={{color:palette.faint}}>/ {target}%</span></span>
                    </div>
                    <div style={{ position:"relative", height:7, background:palette.panel2, borderRadius:4 }}>
                      <div style={{ position:"absolute", left:`${target}%`, top:-2, bottom:-2, width:2, background:palette.faint, opacity:.7 }} />
                      <div style={{ height:"100%", width:`${Math.min(100,weight)}%`, background:palette.acc, borderRadius:4 }} />
                    </div>
                  </div>
                );
              })}
              <button className="seg" style={{ marginTop:4, width:"100%" }} onClick={() => setStagflation(previous=>!previous)}>
                Modo estanflación: {stagflation ? "activo (120/60/20)" : "normal (120/40/40)"}
              </button>
            </>
          )}
        </div>

        <WealthEvolutionChart portfolio={portfolio} total={total} liquidityTotal={liquidityTotal} onSummaryChange={setEvolutionSummary} />

        <div className={`${compositionKeys.length > 0 ? "card" : "card span-full"} widget-emergency-fund`}>
          <div className="eyebrow" style={{ marginBottom:14 }}>Fondo de emergencia / casa</div>
          {wealthTargets == null ? (
            <div style={{ fontSize:12.5, color:palette.faint, lineHeight:1.5 }}>
              Configura tus objetivos de patrimonio para ver el progreso del fondo de emergencia.
            </div>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:4 }}>
                <span className="num disp" style={{ fontSize:34, fontWeight:600 }}>{currencyFormatter.euro(liquidityTotal)}</span>
                <span className="num" style={{ color:palette.faint }}>/ {currencyFormatter.euro(wealthTargets.emergencyFund)}</span>
              </div>
              <div style={{ height:10, background:palette.panel2, borderRadius:6, overflow:"hidden", margin:"14px 0 10px", position:"relative" }}>
                <div style={{ position:"absolute", left:`${wealthTargets.minimumFund/wealthTargets.emergencyFund*100}%`, top:0, bottom:0, width:2, background:palette.ink, opacity:.5, zIndex:2 }} />
                <div
                  role="status"
                  aria-label={thresholdStatus?.isEmergencyFundBelowMinimum ? "Fondo de emergencia por debajo del mínimo" : thresholdStatus?.isEmergencyFundComplete ? "Fondo de emergencia completo" : "Fondo de emergencia en progreso"}
                  style={{
                    height:"100%", width:`${Math.min(100,liquidityTotal/wealthTargets.emergencyFund*100)}%`, borderRadius:6,
                    background: thresholdStatus?.isEmergencyFundBelowMinimum ? palette.bad : `linear-gradient(90deg,${palette.faint},${palette.acc})`,
                  }}
                />
              </div>
              <div style={{ fontSize:12, color:palette.sub }}>
                {liquidityTotal < wealthTargets.minimumFund
                  ? `Faltan ${currencyFormatter.euro(wealthTargets.minimumFund-liquidityTotal)} para el mínimo intocable.`
                  : `${currencyFormatter.percent(liquidityTotal/wealthTargets.emergencyFund*100)} del objetivo. Cubre ~${(liquidityTotal/778.89).toFixed(1)} meses de gastos.`}
              </div>
            </>
          )}
        </div>

        {compositionKeys.length > 0 && (
          <div className="card span-2" style={{ minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:16 }}>
              <div className="eyebrow">Qué hay dentro de cada fondo</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {compositionKeys.map(key => <button key={key} className={`seg ${activeDrilldown===key?"on":""}`} onClick={()=>setDrilldown(key)}>{COMPOSITIONS[key].name.split(" ").slice(-1)[0]}</button>)}
                <span style={{ width:1, background:palette.line, margin:"0 4px" }} />
                {([["countries","Países"],["sectors","Sectores"]] as Array<[CompositionView, string]>).map(([key,label]) => <button key={key} className={`seg ${view===key?"on":""}`} onClick={()=>setView(key)}>{label}</button>)}
              </div>
            </div>
            <div className="compo">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={compositionData} layout="vertical" margin={{ left:0, right:16 }}>
                  <XAxis type="number" hide domain={[0,"dataMax"]} />
                  <YAxis type="category" dataKey="name" width={88} stroke={palette.faint} tick={{ fontSize:11.5 }} />
                  <Tooltip formatter={(value)=>`${value}%`} itemStyle={{color:palette.ink}} contentStyle={{background:palette.panel2,border:`1px solid ${palette.line}`,borderRadius:8}} cursor={{fill:palette.panel2}} />
                  <Bar dataKey="value" radius={[0,4,4,0]}>{compositionData.map((_entry,barIndex)=><Cell key={barIndex} fill={seriesColorAt(barIndex)} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="hide-sm">
                <div style={{ fontSize:13, color:palette.sub, lineHeight:1.7 }}>
                  <strong style={{ color:palette.ink }}>{composition?.name}</strong><br/>
                  {view==="countries"
                    ? `Exposición geográfica. ${compositionData[0]?.name} pesa ${compositionData[0]?.value}%: tu mayor concentración vía este fondo.`
                    : `Reparto sectorial. Tecnología pesa ${composition?.sectors.find(sector=>sector.name==="Tecnología")?.value ?? 0}% aquí.`}
                  <br/><br/><span style={{ color:palette.faint, fontSize:12 }}>Composición orientativa (jun 2026), se actualiza despacio.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
