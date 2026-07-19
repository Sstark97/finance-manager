# Review: Proyección de amortización de deuda (pestaña Deudas)

## Verdict: PASS

## Blocking findings
- None.

## Warnings (non-blocking)
- `src/features/debts/components/DebtProjectionChart.tsx:49,60` — The active-debt set is computed twice: once as `new DebtLedger(debts).active().length` and again inside `project()`, which re-runs `DebtLedger(debts).active()`. Harmless and readable, but slightly redundant.
- `src/features/debts/components/DebtProjectionChart.tsx:60` — `new Date()` is read during render, so the projection reference date is non-deterministic across renders. Fine for a "today onward" chart, but worth noting it is not memoized/derived from a stable prop.
- `src/shared/domain/DebtAmortizationProjector.ts:25` — In the `installment <= 0` case the loop always emits `horizonMonths + 1` points (361 by default). Correct and bounded (no infinite loop / NaN / Infinity), but it is the one path that produces a large point array; acceptable given recharts handles it and the UI shows the horizon warning.

## Positive points
- Math is correct. `monthIndex` starts at 0, so the first point reflects the real current balance (no month over/under-counted). `Math.max(0, balance - installment * monthIndex)` clamps each debt at zero, so a debt that liquidates early stops contributing instead of going negative — verified against the multi-debt test `[3000, 1500, 1000, 500, 0]` (debtFreeMonth 4).
- Point recording stops the moment the total hits zero (`break` on `totalRemaining <= 0`), so no hundreds of padding zeros — verified: `[carLoan]` yields exactly 2 points.
- `installment <= 0` returns a constant balance, never reaches zero, and is cut cleanly at the horizon with `debtFreeMonth === null`; the UI's "no te librarás... en los próximos 30 años" warning fires for this case (tested).
- `debtFreeMonth` → years/months arithmetic is correct: `Math.floor(months / 12)` years, `months % 12` months, with correct singular/plural handling.
- Dataviz follows the skill and the existing `WealthEvolutionChart` pattern: single series, no legend, hidden axes, accessible tooltip, reused `@/lib/theme` palette (`acc`/`faint`/`warn`/`panel2`/`ink`/`sub`/`line` all exist — no new palette), and a graceful empty state that renders no broken chart.
- Hexagonal: `DebtAmortizationProjector` lives in `src/shared/domain/`, imports only `DebtLedger` and the `Debt` type — zero React/Next/libSQL. The client component depends inward on the domain singleton, never on infrastructure.
- Class-first: real class with intent-revealing methods (`project`, `remainingBalanceAt`, `addMonths`) and a `debtAmortizationProjector` singleton matching the `DebtLedger`/`NetWorthCalculator` convention. `new DebtLedger(...)` in the component is consistent with established codebase usage (`DebtsSection`, `WealthTab`).
- Semantics: no comments, self-documenting names, no `useEffect` (projection derived directly in render), and `||` in `yearsPart || monthsPart || "0 meses"` is the *correct* choice over `??` because empty strings must fall through — not a nullish-coalescing violation.
- TypeScript: no `any`, explicit return types on all public/exported functions, strict-compatible.
- Tests exercise real behavior (value arrays, `debtFreeMonth`, point counts, date labels) across all the flagged edge cases — different rates, `installment 0`, horizon cut, no-padding, settled exclusion — and component tests use semantic `getByText`. All 16 new tests pass locally.
- Scope respected: changes limited to the Deudas feature and the shared projection domain; Dashboard, Patrimonio and Presupuesto untouched. The `Debt` type/schema is unchanged.
