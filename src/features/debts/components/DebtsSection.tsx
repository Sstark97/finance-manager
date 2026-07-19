"use client";

import React, { useState, useEffect, useRef } from "react";
import { palette } from "@/lib/theme";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import { idGenerator } from "@/lib/IdGenerator";
import type { Debt } from "@/shared/domain/types";
import { DebtLedger } from "@/shared/domain/DebtLedger";
import { DebtDeadline } from "@/shared/domain/DebtDeadline";
import { Metric } from "@/shared/ui/Metric";
import { DebtProjectionChart } from "@/features/debts/components/DebtProjectionChart";
import { SavedToast, SAVED_MESSAGE_DURATION_MS } from "@/shared/ui/SavedToast";
import { saveDebts } from "@/app/actions/saveDebts";

export interface DebtsSectionProps {
  initialDebts: Debt[];
  portfolioTotal: number;
}

const PERSIST_DEBOUNCE_MS = 800;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatSettlementDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function DeadlineBadge({ deadlineIsoDate }: { deadlineIsoDate: string }): React.JSX.Element {
  const deadline = DebtDeadline.fromIsoDate(deadlineIsoDate, new Date());
  const color = deadline.isOverdue() ? palette.bad : deadline.isApproaching() ? palette.warn : palette.faint;
  return (
    <span
      role="status"
      style={{ fontSize: 11, fontWeight: 600, color, border: `1px solid ${color}`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}
    >
      {deadline.label()}
    </span>
  );
}

export function DebtsSection({ initialDebts, portfolioTotal }: DebtsSectionProps): React.JSX.Element {
  const [debts, setDebts] = useState<Debt[]>(initialDebts);

  const pendingDebtsFlush = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      pendingDebtsFlush.current?.();
    };
  }, []);

  const isFirstDebtsRun = useRef(true);
  useEffect(() => {
    if (isFirstDebtsRun.current) { isFirstDebtsRun.current = false; return; }
    const persistDebts = (): void => {
      pendingDebtsFlush.current = null;
      saveDebts(debts).catch((error: unknown) => console.error("Failed to persist debts", error));
    };
    pendingDebtsFlush.current = persistDebts;
    const timeoutId = setTimeout(persistDebts, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [debts]);

  const [sectionOpen, setSectionOpen] = useState<boolean>(true);
  const [editing, setEditing] = useState<boolean>(false);
  const [draftDebts, setDraftDebts] = useState<Debt[]>(debts);
  const [syncedDebtsSnapshot, setSyncedDebtsSnapshot] = useState<string>(JSON.stringify(debts));
  const [saved, setSaved] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);

  const debtsSnapshot = JSON.stringify(debts);
  if (!editing && debtsSnapshot !== syncedDebtsSnapshot) {
    setSyncedDebtsSnapshot(debtsSnapshot);
    setDraftDebts(debts);
  }

  const hasUnsavedChanges = JSON.stringify(draftDebts) !== debtsSnapshot;

  const referenceDate = new Date();
  const ledger = new DebtLedger(debts);
  const draftLedger = new DebtLedger(draftDebts);
  const activeDebts = editing ? draftLedger.activeSortedByDeadlineUrgency(referenceDate) : ledger.activeSortedByDeadlineUrgency(referenceDate);
  const settledDebts = editing ? draftLedger.settled() : ledger.settled();
  const totalSettledBalance = editing ? draftLedger.totalSettledBalance() : ledger.totalSettledBalance();

  const totalDebt = ledger.totalActiveBalance();
  const netWorth = portfolioTotal - totalDebt;
  const draftTotalDebt = draftLedger.totalActiveBalance();
  const draftNetWorth = portfolioTotal - draftTotalDebt;
  const displayedTotalDebt = editing ? draftTotalDebt : totalDebt;
  const displayedNetWorth = editing ? draftNetWorth : netWorth;

  const renameDebt = (id: string, value: string): void =>
    setDraftDebts(list => list.map(debt => (debt.id === id ? { ...debt, name: value } : debt)));
  const editDebtNote = (id: string, value: string): void =>
    setDraftDebts(list => list.map(debt => (debt.id === id ? { ...debt, note: value } : debt)));
  const editDebtInstallment = (id: string, value: string): void =>
    setDraftDebts(list => list.map(debt => (debt.id === id ? { ...debt, installment: parseFloat(value) || 0 } : debt)));
  const editDebtBalance = (id: string, value: string): void =>
    setDraftDebts(list => list.map(debt => (debt.id === id ? { ...debt, balance: parseFloat(value) || 0 } : debt)));
  const editDebtDeadline = (id: string, value: string): void =>
    setDraftDebts(list => list.map(debt => (debt.id === id ? { ...debt, deadline: value === "" ? undefined : value } : debt)));
  const toggleDebtIsLongTerm = (id: string): void =>
    setDraftDebts(list => list.map(debt => (debt.id === id ? { ...debt, isLongTerm: !debt.isLongTerm } : debt)));
  const settleDebt = (id: string): void =>
    setDraftDebts(list => new DebtLedger(list).settle(id, todayIsoDate()).all());
  const addDebt = (): void =>
    setDraftDebts(list => [...list, { id: idGenerator.generate(), name: "Nueva deuda", installment: 0, balance: 0, note: "", isLongTerm: false }]);

  const requestDebtDeletion = (id: string): void => setPendingDeletionId(id);
  const cancelDebtDeletion = (): void => setPendingDeletionId(null);
  const confirmDebtDeletion = (id: string): void => {
    setDraftDebts(list => new DebtLedger(list).discard(id).all());
    setPendingDeletionId(null);
  };

  const toggleEditing = (): void => {
    setEditing(previous => !previous);
    setPendingDeletionId(null);
  };
  const saveDraftDebts = (): void => {
    setDebts(draftDebts);
    setEditing(false);
    setPendingDeletionId(null);
    setSaved(true);
    setTimeout(() => setSaved(false), SAVED_MESSAGE_DURATION_MS);
  };
  const discardChanges = (): void => {
    setDraftDebts(debts);
    setEditing(false);
    setPendingDeletionId(null);
  };

  const renderDeleteAction = (debt: Debt): React.JSX.Element =>
    pendingDeletionId === debt.id ? (
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: palette.sub }}>¿Seguro?</span>
        <button className="seg" onClick={() => confirmDebtDeletion(debt.id)} style={{ background: palette.bad, borderColor: palette.bad, color: "#fff" }}>Sí</button>
        <button className="seg" onClick={cancelDebtDeletion}>Cancelar</button>
      </span>
    ) : (
      <button className="seg" onClick={() => requestDebtDeletion(debt.id)} title="Eliminar deuda" style={{ color: palette.bad }}>Eliminar</button>
    );

  return (
    <div className="card span-2">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <button
          className="eyebrow"
          onClick={() => setSectionOpen(previous => !previous)}
          aria-expanded={sectionOpen}
          style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 8 }}
        >
          <span aria-hidden="true" style={{ display: "inline-block", transition: ".15s", transform: sectionOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>
          Deudas y patrimonio neto
        </button>
        <div className="num" style={{ fontSize: 12.5 }}>
          <span style={{ color: palette.sub }}>Deuda total: </span>
          <span style={{ color: totalDebt > 0 ? palette.bad : palette.acc, fontWeight: 600 }}>{currencyFormatter.euro(totalDebt)}</span>
        </div>
      </div>

      {sectionOpen && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button className="seg on" onClick={toggleEditing}>
              {editing ? "Cerrar edición" : "Editar deudas"}
            </button>
            <SavedToast visible={saved} />
          </div>

          {!editing && (
            activeDebts.length === 0 ? (
              <div style={{ fontSize: 12.5, color: palette.faint, marginBottom: 14 }}>Aún no has añadido deudas.</div>
            ) : (
              activeDebts.map(debt => (
                <div key={debt.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${palette.line}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13.5, color: palette.ink }}>{debt.name}</div>
                      {debt.note && <div style={{ fontSize: 11.5, color: palette.faint, marginTop: 2 }}>{debt.note}</div>}
                    </div>
                    <div className="num" style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12.5 }}>
                      {debt.isLongTerm && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: palette.faint, border: `1px solid ${palette.line}`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>
                          Largo plazo
                        </span>
                      )}
                      {debt.deadline && <DeadlineBadge deadlineIsoDate={debt.deadline} />}
                      <span style={{ color: palette.sub }}>Cuota {currencyFormatter.euro(debt.installment)}/mes</span>
                      <span style={{ color: palette.ink, fontWeight: 600 }}>{currencyFormatter.euro(debt.balance)}</span>
                    </div>
                  </div>
                </div>
              ))
            )
          )}

          {editing && (
            <>
              {activeDebts.length === 0 ? (
                <div style={{ fontSize: 12.5, color: palette.faint, marginBottom: 14 }}>Aún no has añadido deudas.</div>
              ) : (
                activeDebts.map(debt => (
                  <div key={debt.id} className="deuda-row" style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${palette.line}` }}>
                    <div>
                      <label>
                        <div style={{ fontSize: 10.5, color: palette.faint, marginBottom: 2 }}>Nombre</div>
                        <input className="inp" value={debt.name} onChange={(event: React.ChangeEvent<HTMLInputElement>) => renameDebt(debt.id, event.target.value)} style={{ fontFamily: "'DM Sans',sans-serif" }} />
                      </label>
                      <label style={{ display: "block", marginTop: 6 }}>
                        <div style={{ fontSize: 10.5, color: palette.faint, marginBottom: 2 }}>Nota</div>
                        <input className="inp" value={debt.note} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editDebtNote(debt.id, event.target.value)} style={{ fontFamily: "'DM Sans',sans-serif" }} />
                      </label>
                    </div>
                    <label>
                      <div style={{ fontSize: 10.5, color: palette.faint, marginBottom: 2 }}>Cuota/mes</div>
                      <input className="inp" type="number" step="any" value={debt.installment} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editDebtInstallment(debt.id, event.target.value)} />
                    </label>
                    <label>
                      <div style={{ fontSize: 10.5, color: palette.faint, marginBottom: 2 }}>Saldo pendiente</div>
                      <input className="inp" type="number" step="any" value={debt.balance} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editDebtBalance(debt.id, event.target.value)} />
                    </label>
                    <label>
                      <div style={{ fontSize: 10.5, color: palette.faint, marginBottom: 2 }}>Fecha límite</div>
                      <input className="inp" type="date" value={debt.deadline ?? ""} onChange={(event: React.ChangeEvent<HTMLInputElement>) => editDebtDeadline(debt.id, event.target.value)} />
                    </label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        className={`seg ${debt.isLongTerm ? "on" : ""}`}
                        onClick={() => toggleDebtIsLongTerm(debt.id)}
                        aria-pressed={debt.isLongTerm}
                        title="Excluir del patrimonio neto principal (hipoteca, préstamo familiar...)"
                      >
                        Largo plazo
                      </button>
                      {pendingDeletionId !== debt.id && (
                        <button className="seg on" onClick={() => settleDebt(debt.id)} title="Marcar como liquidada">Liquidar</button>
                      )}
                      {renderDeleteAction(debt)}
                    </div>
                  </div>
                ))
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 14, marginBottom: 14 }}>
                <button className={`seg ${hasUnsavedChanges ? "on" : ""}`} onClick={saveDraftDebts} disabled={!hasUnsavedChanges}>Guardar cambios</button>
                {hasUnsavedChanges && <button className="seg" onClick={discardChanges}>Descartar</button>}
                {hasUnsavedChanges && <span style={{ fontSize: 12, color: palette.warn }}>Cambios sin guardar</span>}
                <button className="seg" onClick={addDebt}>+ Añadir deuda</button>
              </div>
            </>
          )}

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${palette.line}` }}>
            <DebtProjectionChart debts={debts} />
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${palette.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <button
                className="eyebrow"
                onClick={() => setHistoryOpen(previous => !previous)}
                aria-expanded={historyOpen}
                style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 8 }}
              >
                <span aria-hidden="true" style={{ display: "inline-block", transition: ".15s", transform: historyOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>
                Deudas liquidadas ({settledDebts.length})
              </button>
              {settledDebts.length > 0 && (
                <span className="num" style={{ fontSize: 11.5, color: palette.faint }}>Total saldado: {currencyFormatter.euro(totalSettledBalance)}</span>
              )}
            </div>

            {historyOpen && (
              settledDebts.length === 0 ? (
                <div style={{ fontSize: 12.5, color: palette.faint, marginTop: 10 }}>Aún no has liquidado deudas.</div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  {settledDebts.map(debt => (
                    <div key={debt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${palette.line}`, opacity: 0.7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: palette.acc }}>✓</span>
                        <div>
                          <div style={{ fontSize: 13, color: palette.ink }}>{debt.name}</div>
                          <div style={{ fontSize: 11, color: palette.faint, marginTop: 2 }}>
                            Liquidada el {debt.settledAt ? formatSettlementDate(debt.settledAt) : ""}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span className="num" style={{ color: palette.sub }}>{currencyFormatter.euro(debt.balance)}</span>
                        {editing && renderDeleteAction(debt)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
            <Metric label="Deuda total" value={currencyFormatter.euro(displayedTotalDebt)} sub="saldo de deudas activas" />
            <Metric label="Patrimonio neto" value={currencyFormatter.euro(displayedNetWorth)} sub="activos − deudas activas" />
          </div>
        </div>
      )}
    </div>
  );
}
