# Review: Migración a páginas App Router, frontera Server/Client y limpieza

## Verdict: FAIL

Las cuatro dimensiones bloqueantes del checklist (TypeScript, hexagonal, class-first,
semántica) se cumplen y el código es de alta calidad. El FAIL se debe a que el cambio
**rompe directamente su propia suite e2e** —la que cubre exactamente la superficie de
navegación/rutas que este PR reescribe— y deja sin entregar la cobertura e2e de navegación
y coherencia cross-sección que el propio plan se comprometía a añadir. `pnpm test:e2e`
verde es un criterio de aceptación explícito del plan (paso 10) que la implementación no
satisface.

## Blocking findings

- `e2e/wealth.e2e.spec.ts:7` — El test hace `page.goto("/")` y acto seguido pulsa
  "Editar cartera". Antes `/` era la pestaña Patrimonio; ahora `/` es el Dashboard (Resumen),
  que no contiene "Editar cartera". La rotura la causa **este** PR (movió Patrimonio a
  `/wealth`), no un desajuste incidental preexistente. El test fallará.
- `e2e/goals.e2e.spec.ts:8` — `getByRole("button", { name: "Metas" })` ya no encuentra la nav:
  ahora es `<Link role="tab">` (`DesktopTabNav`), no un `button`. Fallará. Además nunca navega
  a `/goals` por URL, depende del click en la nav rota.
- `e2e/budget.e2e.spec.ts:9` — `getByRole("button", { name: "Presupuesto" })` idéntico problema:
  la nav pasó a `role="tab"`. Fallará.
- Cobertura e2e prometida no entregada — El plan (Testing strategy y Architecture decisions)
  se comprometía explícitamente a "un e2e ligero de Playwright" para la navegación entre rutas
  **incluyendo un caso de coherencia** (editar en Patrimonio → navegar a Resumen → ver el valor
  guardado), que es justo la garantía que compensa el trade-off de pasar de estado en memoria a
  "eventual vía guardado + refetch". No se añadió ningún e2e nuevo. La decisión del agente de
  dejar los e2e "fuera de alcance" no es razonable aquí porque el PR es la causa directa de la
  rotura y porque esa cobertura era parte del propio plan.

## Warnings (non-blocking)

- `src/app/(app)/page.tsx:36` — Al disolver `DashboardTab` en un Server Component, se perdió la
  cobertura de componente que tenía `DashboardTab.unit.test.tsx` (net worth = total − deuda
  activa, exclusión de deuda liquidada, etc.). El cálculo sigue cubierto en el dominio
  (`DashboardSummaryCalculator`/`NetWorthCalculator`), pero el render de las cards del resumen
  (formato, ramas de estado vacío) queda sin ningún test. Aceptable si el dominio cubre el
  cálculo, pero conviene un smoke test o el e2e de coherencia prometido.
- `src/app/(app)/layout.tsx:11` y cada `page.tsx` — La auth se resuelve dos veces por request
  (`requireUser()` en el layout + `requireUserId()` en la page). Defensivo y correcto, pero es
  una llamada duplicada por navegación; no bloquea.
- `src/shared/ui/DesktopTabNav.tsx:16` / `src/shared/ui/MobileTabBar.tsx:21` — Se conserva el
  patrón `role="tablist"/"tab"` sobre enlaces de navegación real (`next/link`), que es un
  antipatrón ARIA (las tabs no deberían cambiar de URL/ruta). No es una regresión —se preserva
  el patrón previo y `aria-selected`/`.on` se derivan bien de `usePathname()`— pero si algún día
  se toca la accesibilidad, es el punto a reconsiderar.

## Positive points

- **Frontera Server/Client correcta y honesta.** Las 5 `page.tsx` son Server Components que
  resuelven casos de uso vía `container` y siembran islas client con props ya serializadas; las
  islas llaman Server Actions. No se reintrodujo Zustand. Dashboard es server real (calculadoras
  de dominio en servidor + islas de gráfico `WealthCompositionChart`/`SurplusHistoryChart`).
- **Sin fugas de props no serializables Server→Client.** Verificado isla por isla: todas reciben
  solo datos. `NAV_ITEMS` pasa iconos a componentes client, pero al exportarse desde un módulo
  `"use client"` (`MobileTabBar.tsx`) son *client references* serializables, no funciones planas
  — patrón válido; `build` y `test` en verde.
- **Autosave debounce/flush correcto y sin fugas.** El patrón `pendingXFlush` + effect de
  desmontaje + `clearTimeout` en cada re-run está bien: guarda el último valor al desmontar,
  no duplica guardado (el timer se limpia), y el guardado inicial sembrado por el server se salta
  con el guard `isFirstXRun`. Tests de debounce y flush-on-unmount son de comportamiento real
  (mock del Server Action al nivel de puerto, `advanceTimersByTimeAsync`), no relleno.
- **Poda de tests bien criteriada.** Se borran los de relleno reales (manifest = restatement de
  config; `FinanceAppShell` estructural; el selector por clase CSS `.card.span-full...` y el
  "should not persist while rendering"). Los tests reescritos de `DebtsSection`/`BudgetTab`
  pasan a aserciones sobre la vista observable (correcto tras eliminar el `setX` prop-drilling).
  `exportFinanceData` y `WealthTargetsResolver` tienen tests de comportamiento reales.
- **Ningún test de dominio/aplicación/integración Turso tocado.** Confirmado por `git status`.
- **Limpieza sin residuos.** `grep` no encuentra referencias colgantes a `FinanceAppShell`,
  `LoadInitialAppState`, `DashboardTab`, `AppChrome` ni a los módulos movidos desde `@/app`.
  `page.module.css`/`page.tsx` antiguos eliminados. Lint limpio.
- **Convenciones de framework intactas.** `build` genera `/`, `/wealth`, `/budget`, `/debts`,
  `/goals`, `manifest.webmanifest`, `icon`, `apple-icon`; `error.tsx` sigue en `src/app/` como
  wrapper fino que delega en `ErrorScreen`. Estilos (`AppStyles` global) y clases
  (`.tabbtn.on`, `.mobile-tabbar`, `.widget-*`, `widget-onboarding-cta` vía `OnboardingCard`
  `className` passthrough) preservados.
- **class-first / DRY.** `WealthTargetsResolver` centraliza el fallback `?? WEALTH_TARGETS_INITIAL`
  como clase con singleton; `OnboardingCard`/`SavedToast`/`SectionHeader` extraen composición de
  UI repetida sin acoplar features. `exportFinanceData` carga solo portfolio/debts/budget, que es
  exactamente lo que `FinanceDataExporter` consume — correcto, no omite datos.
