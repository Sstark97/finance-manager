# Review: Multiuser residuals batch (4 bugfixes)

## Verdict: PASS

Typecheck clean (`tsc --noEmit`), 226/226 unit+integration tests pass, ESLint clean. All 4 bugs
implemented as planned, the migration is non-destructive, and the critical Bug 2 constraint
(manual "Real" input stays bound to `actual`, never `realized`) is satisfied.

## Blocking findings

None.

## Migration safety (production has real data) — verified

- `drizzle/0002_wealthy_weapon_omega.sql` contains exactly two statements:
  - `ALTER TABLE positions ADD equity_index text;` — **nullable**, no `NOT NULL`, no default.
    Existing production rows get `NULL` (= unclassified). Safe.
  - `ALTER TABLE goals_settings DROP COLUMN count_car;` — direct `DROP COLUMN` (not the table
    recreate the plan anticipated). This is **safe**: native `ALTER TABLE DROP COLUMN` has been in
    SQLite since 3.35.0 (2021), and libSQL/Turso track a newer SQLite than that. `count_car` is a
    plain `integer` boolean — not a PK, not UNIQUE, not indexed, not referenced by any FK/CHECK/
    generated column — so the drop cannot fail or corrupt other columns/rows, and the FK on
    `user_id` is untouched (different column). No schema reset, no data loss.
- `drizzle/meta/_journal.json` correctly appends idx 2. Historical `count_car` in `0000/0001`
  snapshots and `0000_*.sql` is expected (immutable migration history) and must stay.

## Bug-by-bug verification

- **Bug 1 (equityIndex)**: `PortfolioCalculator.equityWeightOf` now filters `equityItems` by
  `equityIndex` and **sums** (`reduce`), so multiple funds tracking the same index aggregate
  correctly (`PortfolioCalculator.ts:34-38`). `WealthTab.tsx`: index `<select>` renders only for
  `fondo`/`etf` (`:294`); `editPosition` resets `equityIndex` to `null` when the type changes to
  `cripto`/`efectivo` (`:115`); `addPosition` seeds `equityIndex: null` (`:126`); `compositionKeys`
  and the real-vs-target `exists` flag filter by `position.equityIndex` (`:106`, `:453`). Schema
  column nullable, `PositionRowMapper` maps both directions incl. `null`.
- **Bug 2 (events → Real, not Budgeted)** — critical point PASSED: `values[cat] = baseTarget` with
  no events added (`MonthlyBudgetCalculator.ts:23`); `realized[cat] = registered ? (actual ??
  values) + categoryEvents : null` (`:38`); `totalActual` falls back to `values` when `realized`
  is null (`:40-43`). In `BudgetMonthlyBreakdown.tsx` the "Real" input is bound to
  `manualActualValue = draftResult.actual[cat]` (`:140`, `:158`) — **not** `realized` — preserving
  manual editing. Chart `Real` and the `delta`/`isRegistered` flags use `realized` (`:89`,
  `:142-143`), and `annualEvolution` uses `realized` (`:96-99`). Consistent.
- **Bug 3 (debt edit/delete)**: `editDebtText` for name/note (`GoalsTab.tsx:49`, inputs at
  `:140`,`:144`), `removeDebt` filters the array (`:52`) and "Eliminar" button (`:157`); the
  existing autosave `saveAll` replaces the whole list, so removal persists. "Liquidar"
  (`markSettled`, `:51`/`:156`) is intact and untouched.
- **Bug 4 (countCar / Apple Watch cleanup)**: `netWorth = total - totalDebt` in both `GoalsTab`
  (`:47`) and `WealthTab` (`:69`), Metric sub simplified to "activos − deudas". `count_car` removed
  from schema, `GoalsSettings` interface, `GoalsSettingsRowMapper`, `goalsSettings.ts` data, and
  onboarding. Grep over production code (`src` excluding `*.test.*`) for
  `countCar|count_car|applewatch|apple watch` returns **zero** matches. Remaining `applewatch`
  occurrences are only inert test fixture ids (no code branches on them).
- **Unplanned fix (`e2e/setup/prepare-database.mjs`)**: the raw seed SQL now inserts
  `equity_index` (value `null`) into `positions` and drops `count_car` from the `goals_settings`
  insert — column lists and arg arrays match the new schema. Correct, no misalignment.

## Test coverage — verified

- Unit: `MonthlyBudgetCalculator` (values plan-only, realized null/manual/events/combined,
  totalActual), `PortfolioCalculator` (sum-by-index).
- Mapper: `PositionRowMapper` round-trips `equity_index` with a value and with `null`.
- Integration (real local libSQL): `TursoPortfolioRepository` round-trips `equityIndex` incl.
  `null` and an assigned `"world"`.
- Component (RTL, role/label/text queries): new `BudgetMonthlyBreakdown.unit.test.tsx` asserts an
  event raises "Real"/"vs plan" but leaves "Total presupuestado" untouched, and that the manual
  "Real" input stays empty; `GoalsTab` covers name edit, Eliminar filtering, absence of car
  checkbox and Apple Watch banner; `WealthTab` updated for the index selector / real-vs-target.

## Class-first / hexagonal / semantic — verified

- Logic stays in domain classes (`PortfolioCalculator`, `MonthlyBudgetCalculator`) and infra
  mappers. No new loosely-exported feature functions. `domain/` imports no framework/DB.
- Names express business intent (`equityIndex`, `realized`, `EquityIndexKey`,
  `setPositionEquityIndex`, `editDebtText`/`editDebtNumber`). No new comments introduced by the
  diff (verified against added lines). No new `any` (the only `any` matches are the `step="any"`
  HTML attribute).

## Warnings (non-blocking) — RESUELTOS 2026-07-12

- `src/features/budget/components/BudgetMonthlyBreakdown.tsx:89` — **Fijado.** Cambiado a
  `result.realized[cat] ?? result.values[cat]`.
- `src/features/goals/components/GoalsTab.tsx:207` — **Fijado.** Se quitó la referencia personal
  "AW liberado + Kindle liberado" (sustituida por "deudas liquidadas", genérico) y también la
  fecha hardcodeada "nov–dic 2026", que además estaba **desincronizada** de `BTC_OP_GOAL.window`
  ("sep–dic 2026" en `config.ts`) — el párrafo mostraba dos ventanas distintas y contradictorias.
  Ahora solo se interpola `{BTC_OP_GOAL.window}`, sin duplicar el dato.

## Positive points

- The critical Bug 2 separation is implemented exactly as the plan demanded: the manual "Real"
  input remains wired to `actual`, so manual editing is preserved while events flow into `realized`.
- Migration is minimal and genuinely non-destructive; the deviation from the planned table-recreate
  (a direct `DROP COLUMN`) is actually the safer/cleaner outcome for this SQLite/libSQL version.
- `equityWeightOf` correctly aggregates multiple positions per index rather than matching one.
- Tests are behavioral and query by semantic roles/labels/text (no Recharts internals, no CSS
  selectors), and integration tests exercise a real libSQL file including the `null` case.
