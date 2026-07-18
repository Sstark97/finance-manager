# Review: Fase 1 "Quick wins" (análisis de producto)

## Verdict: PASS

## Blocking findings
- None. `tsc --noEmit`, `eslint` and `vitest` (318/318) all green. Zero `any`, explicit return types on public functions, hexagonal boundaries respected, extraction to real classes/VOs confirmed, no stale imports after the DebtsSection move.

## Warnings (non-blocking)
- `src/app/FinanceAppShell.tsx:176` / `src/app/MobileTabBar.tsx:27` — Incomplete WAI-ARIA tabs pattern. Desktop tabs set `aria-controls="finance-tabpanel"` but the target `<main id="finance-tabpanel">` (line 195) carries no `role="tabpanel"` (it is a landmark). Mobile tabs declare `role="tab"` with no `aria-controls` at all. Functionally labeled and selectable, but not a fully conformant tabs widget. (There is a genuine tension: an element cannot be both `main` landmark and `tabpanel`; consider a wrapping tabpanel inside `<main>`, or drop `role="tab"` in favor of a nav pattern.)
- `src/app/FinanceDataExporter.ts` — Pure cross-feature domain/application logic (imports only domain types + `monthlyBudgetCalculator`, zero framework deps) placed in `src/app/`, the Next.js driving-adapter layer. Its siblings from this same phase (`WealthThresholdEvaluator`, `MonthlyRecapCalculator`) correctly live in `features/*/domain/`. Does not break the dependency rule, but the placement is inconsistent; `src/shared/domain/` would match the established pattern.
- `src/features/debts/components/DebtsSection.tsx:33` and `src/features/wealth/components/WealthTab.tsx:539` — `role="status"` used on static badges / the emergency-fund bar. `status` is a live region for announcing changes; on non-updating content it is slightly off-label. Minor.
- `src/features/budget/domain/MonthlyRecapCalculator.ts:48` — `result.realized[category.id] as number` type assertion (safe given the guard on lines 43-44, but a typed lookup would avoid the cast).

## Positive points
- DebtsSection move `goals/ → debts/` is clean: no stale references anywhere in `src/`, `GoalsTab` props (`debts`/`setDebts`) and its tests were pruned correctly, new tab wired into both `FinanceAppShell` and `MobileTabBar`.
- Threshold logic genuinely extracted from the in-component IIFE into `WealthThresholdEvaluator`, a real class returning a typed `WealthThresholdStatus`; the component now only maps status booleans to UI. Deadline logic is a proper immutable VO (`DebtDeadline`, private constructor + `fromIsoDate` factory).
- `BrowserFileDownloader` correctly isolated in `infrastructure/` (browser `Blob`/`URL`/`document` APIs), consumed by the shell — the exporter stays pure. Good port/adapter split.
- Tests follow conventions: `describe("ClassName")` + `it("should …")`, semantic role queries (`getByRole("tab"/"main"/"heading")`), mocks only at boundaries (server actions + `BrowserFileDownloader` port), domain instantiated for real. `|| 0` in `DebtsSection` is correct (NaN guard, `??` would not catch NaN) and is pre-existing.
- Data model for movements/categories untouched — in scope for this phase.
