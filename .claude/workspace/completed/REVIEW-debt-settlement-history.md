# Review: Liquidación de deudas con histórico y borrado permanente

## Verdict: PASS

## Blocking findings
- None.

## Warnings (non-blocking)
- `src/features/goals/components/DebtsSection.tsx:48` — `totalSettledBalance` is computed with a raw inline `reduce` over balances, exactly the duplication `DebtLedger` was created to eliminate. The ledger centralizes `totalActiveBalance()` but the settled total leaks back into the component. Consider adding `DebtLedger.totalSettledBalance()` for symmetry and DRY.
- `src/features/goals/components/DebtsSection.tsx:66` and `:73` — `settleDebt` and `confirmDebtDeletion` read `draftDebts` from the closure (`new DebtLedger(draftDebts)…`) instead of using the functional updater form `setDraftDebts(list => …)` used by every other mutator in the file (`renameDebt`, `editDebtBalance`, `addDebt`, …). Harmless for discrete clicks, but inconsistent and slightly more fragile against batched updates.
- `src/features/goals/components/DebtsSection.tsx:223` — the `settledAt ? … : ""` fallback renders an empty string for a settled debt with no date. A settled debt always has a date by construction (the type keeps them coupled only by convention), so the guard is dead defensive code; acceptable but reads as if the invalid state were expected.

## Positive points
- `DebtLedger` is a clean, framework-free domain value object: pure `filter`/`map`/`reduce`, fully immutable, no dependency beyond the `Debt` type. Hexagonal boundary respected — domain imports only types; UI and mapper consume it inward.
- The divergence bug that motivated the extraction is genuinely fixed: both `DebtsSection.tsx:50` and `WealthTab.tsx:69` now compute the total through the same `DebtLedger.totalActiveBalance()`, no duplicated `reduce`.
- Two-step deletion is airtight: the first click only sets `pendingDeletionId` and swaps the row to a "¿Seguro? Sí / Cancelar" prompt; the actual `discard` runs only in `confirmDebtDeletion`. There is no path that removes a debt without the confirmation step, and it is verified by tests (active and settled debts).
- Mapper round-trip is symmetric (`settledAt ?? undefined` ⇄ `settledAt ?? null`), mirroring the existing `deadline` pattern, and covered by unit + real-libSQL integration tests.
- Migration `0003_even_butterfly.sql` is a faithful `ALTER TABLE debts ADD settled_at text;` (nullable), consistent with `schema.ts` and the regenerated snapshot (`settled_at`, notNull: false); no hand-editing artifacts. Nullable column keeps existing debts active (backward compatible).
- Save flow is intact: `DebtsSection` still works on a local draft and only lifts changes via `setDebts(draftDebts)` on "Guardar cambios"; `FinanceAppShell`'s debounced autosave effect over the full `debts` array is untouched, so settlements/deletions persist through the existing path with no new use case or Server Action.
- Strong test coverage with no superfluous mocks: `DebtLedger` tested as a real value object, mapper/repository at the boundary, component tests query by role/text and assert observable behavior (history collapsed by default, toggling, empty state, confirmation cancel/confirm). Typecheck clean (no `any`), all 55 affected unit + 8 integration tests green.
