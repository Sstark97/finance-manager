# Review: New-user empty states + null-safe singleton repos

## Verdict: PASS

## Critical-risk checks (all satisfied)

**1. `checkHasBeenSeeded` seed detection** — `src/app/LoadInitialAppState.ts:55-58` now reads `const goalsSettings = await this.dependencies.loadGoalsSettings.invoke(); return goalsSettings !== null;`. The old try/catch is fully gone. `goals_settings` is still saved *last* in `seed()` (line 70, after the concurrent-request guard), so it remains the seed marker exactly as before — the already-seeded path is preserved. Verified by `LoadInitialAppState.unit.test.ts`, which covers already-seeded, unseeded-runs-seed, partial-failure-doesn't-mark-seeded, and concurrent-request skip.

**2. No new null-pointer assumptions** — `page.tsx:46,49` pass `budget.baseBudget`/`goalsSettings` straight through (both typed nullable). `FinanceAppShell` state is `Budget | null` / `GoalsSettings | null` and never dereferences them; both persistence effects early-return on `null` (`FinanceAppShell.tsx:87,100`) with `baseBudget`/`goalsSettings` in their dep arrays, so the null→non-null transition after onboarding correctly triggers the first persist. `tsc --noEmit` reports no errors — the compiler confirms no unguarded access.

**3. Rules of Hooks in the BudgetTab split** — `BudgetTab.tsx` is a pure dispatcher with **zero hooks**; it branches on `baseBudget == null` before rendering either `BudgetOnboarding` or `BudgetWorkspace`, each of which owns its own hooks. `BudgetMonthlyBreakdown` only mounts when `months.length > 0`, so `months[months.length - 1]` (line 29) can't crash — the fix #1 regression is covered by `BudgetTab.unit.test.tsx` ("should not crash ... when the base budget exists but there are no months yet"). The month-desync reset at `BudgetMonthlyBreakdown.tsx:47-51` uses the setState-during-render pattern, not a `useEffect` — correct per code-semantic ("no useEffect for derived state").

**4. GoalsTab does not persist while `settings` is null** — `GoalsTab.tsx:27-29` early-returns `<GoalsSettingsOnboarding>` when null. `GoalsSettingsOnboarding` holds a purely local draft and only calls back on the explicit "Crear mi configuración de metas" click. Test "should not persist anything while rendering the onboarding form" asserts `setSettings` is never called before confirmation. No empty row is written.

**5. `BudgetSnapshotToSave` vs `BudgetSnapshot`** — Not incoherent duplication. `BudgetSnapshot` (read) has `baseBudget: Budget | null`; `BudgetSnapshotToSave` (write) has `baseBudget: Budget` (non-null). The asymmetry is meaningful: you can *load* a snapshot with no base yet, but *saving* requires one. `saveBudget` action and `LoadInitialAppState.seedBudget` were updated to the write type consistently.

**6. Test depth** — Edge cases are genuinely exercised, not superficial: `months=[]`, `baseBudget=null`, `settings=null`, `portfolio=[]`, `debts=[]`, plus the null-propagation unit tests for `LoadBudget`/`LoadGoalsSettings` and the integration tests flipped from `rejects.toThrow()` to `resolves.toBeNull()`. Component tests query by role/text (not CSS), follow `describe("ClassName")` + `it("should ...")`, and mock only at boundaries (`vi.fn()` ports, stubbed `fetch`).

## Warnings (non-blocking)
- `src/features/budget/components/BudgetWorkspace.tsx` and `BudgetOnboarding.tsx` share the base-budget editor markup and the `editDraft`/`addFixedExpense`/`removeFixedExpense` handlers almost verbatim (DRY). The plan chose "reuse the existing editor as the onboarding surface," but the reuse was done by copy rather than extracting a shared `BudgetBaseEditor`. Acceptable under YAGNI for now; worth extracting if a third caller appears.
- `src/app/page.tsx:15-25` retains a large block comment describing the app. code-semantic discourages explanatory comments, but this is a pre-existing module header, untouched by this change — noting only for completeness.
- Numeric `|| 0` fallbacks (e.g. `BudgetWorkspace.tsx:30`, `GoalsTab.tsx:42`) are intentional NaN guards after `parseFloat`, where `??` would let `NaN` through — so `||` is correct here despite the checklist's general `??` preference. Pre-existing pattern, not introduced by this diff.

## Positive points
- The seed-marker invariant (goals settings saved last) was understood and preserved — the highest-risk item in the plan is handled correctly and test-locked.
- Hexagonal boundaries respected: nullability changes flow port → use case → shell without leaking Turso/Drizzle upward; domain (`month.ts` `createCurrentMonth`) stays framework-free; the removed `throw` correctly reclassifies "not configured" as a domain-modeled `null` rather than an infra error.
- Onboarding components keep drafts local and require an explicit CTA — no silent coalescing to hardcoded defaults, matching the plan's future-`Usuario` intent.
- Test coverage is broad (153 passing) and the new component tests are real behavioral specs.

Key files: `src/app/LoadInitialAppState.ts`, `src/app/FinanceAppShell.tsx`, `src/features/budget/components/BudgetTab.tsx`, `src/features/goals/components/GoalsTab.tsx`.
