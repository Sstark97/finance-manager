# Review: Migración a páginas App Router — Ronda 2

## Veredicto: PASS

Los 4 bloqueantes y los 3 warnings de la ronda 1 están genuinamente resueltos, verificado leyendo el código real y ejecutando la suite. `pnpm test` 398/398, `pnpm build` (incluye `tsc`) y `pnpm lint` limpios. `pnpm test:e2e` 16/16 verificado también de forma independiente por el coordinador tras el review.

## Verificación de los bloqueantes de ronda 1

- **B1 — `wealth.e2e.spec.ts` navegaba a `/`:** Resuelto. Ambos tests hacen `page.goto("/wealth")`.
- **B2 — `goals.e2e`/`budget.e2e` clicaban la nav rota:** Resuelto. Navegan por URL directa (`/goals`, `/budget`). El budget además se reescribió a la UI de movimientos.
- **B3 — faltaba el e2e de coherencia cross-sección:** Entregado. `e2e/navigation-coherence.e2e.spec.ts` con 2 tests: editar objetivo en `/wealth` → "Resumen" → verificar reflejo; editar deuda en `/debts` → "Resumen" → verificar net worth.
- **B4 — suite e2e coherente con el DOM:** Los selectores de nav coinciden con `DesktopTabNav`/`MobileTabBar` (`<Link>`, no `button`).

## Verificación de los warnings de ronda 1

- **W1 — Dashboard sin test:** Resuelto con `src/app/(app)/page.unit.test.tsx`.
- **W2 — `auth()` dos veces por request:** Resuelto con `cache(auth)` en `CurrentUserProvider`.
- **W3 — antipatrón ARIA tabs sobre links:** Resuelto — `<nav aria-label>` + `<Link aria-current="page">`, cero `role="tab"` en el código.

## Nota sobre atribución de bugs preexistentes

El agente atribuyó 2 fixes de e2e a "bugs preexistentes ajenos a este PR". Uno (`budget.e2e`, spinbutton "Real" obsoleto) es correcto — confirmado con `git show HEAD`. El otro (`login.e2e`, heading post-login) es en realidad causado por este mismo PR (`/` pasó de Patrimonio a Dashboard) — el fix en sí es correcto, solo la narrativa de "preexistente" es imprecisa. No afecta al veredicto.

## Puntos positivos

- Frontera Server/Client correcta en todo el árbol tras los fixes.
- `WealthTargetsResolver`, `SectionHeader`, `SavedToast`, `OnboardingCard` extraen composición repetida sin acoplar features.
- Autosave debounce + flush-on-unmount correcto en todas las islas.
- Convenciones de framework intactas (`error.tsx`, `manifest.ts`, `icon.tsx`/`apple-icon.tsx`).
