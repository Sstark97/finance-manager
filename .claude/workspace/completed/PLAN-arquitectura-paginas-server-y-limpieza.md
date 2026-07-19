# Plan: Migración a páginas reales (App Router), conversión selectiva Server/Client, y limpieza de código y tests

> Estado: PROPUESTO. Plan independiente y separado de `PLAN-analisis-producto-mejoras.md` (pausado). No mezclar.

## Goal

Poner orden y simplificar `finance-manager` sin tocar el diseño visual ni las animaciones. En concreto:

1. **Routing real**: convertir el actual conmutador de pestañas client-side (una sola ruta `/` con `useState` de pestaña dentro de `FinanceAppShell`) en **cinco rutas reales de App Router** — Resumen (principal), Patrimonio, Presupuesto, Deudas y Metas — con URL propia, historial de navegador y **code-splitting por ruta** (Recharts y demás sólo se cargan en la sección que lo necesita).
2. **Frontera Server/Client honesta**: cada sección se sirve desde una **página Server Component** que hace el fetch de datos en el servidor; la interactividad (edición, gráficos, polling de precios) queda como **islas Client Component**. Corregir la premisa del encargo (ver "Hallazgo clave").
3. **Limpieza**: eliminar código muerto y abstracciones redundantes, respetar `class-first` (cero funciones helper sueltas exportadas como API), y **extraer componentes comunes** repetidos a `src/shared/ui`.
4. **Poda de tests**: borrar tests de relleno (restatements de config, aserciones por clase CSS, "renders without crashing") conservando los que prueban comportamiento y cálculo real.

## Hallazgo clave (corrige la premisa del encargo y afina la frontera Server/Client)

> Revisión tras dos observaciones del usuario: (1) no forzar `'use client'` a nivel de Tab completo, empujar el límite lo más abajo posible; (2) considerar Server Actions en vez de debounce client-side. Investigado el código real componente a componente, la respuesta es **matizada, no un sí/no global**.

### 1. La persistencia YA usa Server Actions (no hay fetch a rutas propias de guardado)

`src/app/actions/` contiene cinco Server Actions (`savePortfolio`, `saveDebts`, `saveBudget`, `saveGoalsSettings`, `saveWealthTargets`), todas `"use server"`, que resuelven casos de uso vía `container`. `FinanceAppShell` las invoca desde sus cinco `useEffect` de auto-guardado con debounce. **No existe infraestructura de guardado vía rutas API propias que eliminar.** Los únicos `fetch` a rutas propias son **lecturas** de Yahoo: `/api/prices` (POST refresco) y `/api/prices/history` (POST histórico), consumidas por polling desde `WealthTab`/`WealthEvolutionChart`. Son Route Handlers de lectura con sondeo por intervalo: se quedan como están (un Server Action no aporta nada a una lectura que se sondea, y no cachea igual). **Corrección factual al plan previo**: la Fase 2 mencionaba "sustituir fetch a rutas propias como `/api/prices` para guardado" — es un error; `/api/prices` no guarda nada. El patrón actual de guardado **ya es** la "opción C" (Server Action disparado desde un wrapper client con debounce).

### 2. La frontera `'use client'` SÍ puede bajar en Dashboard; en los editores casi no (YAGNI)

- **DashboardTab — gran margen.** Es un render **puro**: cero `useState`, cero `useEffect`, cero handlers. Todos los números salen de calculadoras de dominio (`dashboardSummaryCalculator`, `wealthCompositionCalculator`, `surplusHistoryCalculator`) sobre props. Es client **solo** porque importa Recharts (pie de composición, barras de superávit) y `WealthEvolutionChart`. Por tanto la tarjeta de patrimonio neto, las tres tarjetas de métricas (flujo/FI/fondo) y todos los estados vacíos **pueden ser Server Component** recibiendo escalares ya calculados; solo los 2-3 gráficos quedan como islas client. **Y Dashboard no necesita el store compartido en absoluto**: su `page.tsx` (Server Component) puede hacer el fetch de los slices que necesita, correr las calculadoras en el servidor y pasar escalares ya resueltos. Es una simplificación importante frente a la versión anterior del plan, que asumía que las cinco páginas leen de un store Zustand compartido.
- **WealthTab / BudgetTab+Workspace / GoalsTab / DebtsSection — margen mínimo (YAGNI).** Casi toda la superficie visible es editable fila a fila o depende de estado vivo:
  - *Wealth*: 8 `useState`, polling, Recharts, edición de posiciones y de objetivos; `score`/`alerts` se recalculan en cliente desde `portfolio`/`wealthTargets`. Lo único estático son eyebrows y párrafos de ayuda, entrelazados con lo interactivo. Dividir no aporta nada.
  - *Goals*: inputs controlados (salario, aportación, rentabilidad, ahorro BTC, checkboxes) que **recalculan la proyección en vivo al teclear**. Roadmap y tarjetas dependen de `currentSalary`/`portfolioDerived` vivos. Margen pequeño y entrelazado.
  - *Budget*: `BudgetTab` es un router fino a `BudgetOnboarding`/`BudgetWorkspace`, ambos editores completos.
  - *Debts*: patrón de edición con borrador (`draftDebts`) en estado local; interactivo de arriba abajo.
  - **Conclusión honesta**: en los cuatro editores se mantiene **una isla client por sección**. No se inventan divisiones artificiales.

**Patrón técnico cuando SÍ hay margen (Dashboard)**: el `page.tsx` (Server Component) renderiza el JSX estático directamente y monta cada sub-componente de gráfico —su propio módulo `"use client"`— pasándole como props los datos ya calculados. Un Server Component puede importar y renderizar Client Components; lo que no puede es llevar él mismo `"use client"`. (Alternativa equivalente cuando el estático envuelve a lo interactivo: un Client wrapper que recibe el JSX estático como `children`/props.) Para Dashboard basta lo primero: se disuelve `DashboardTab` monolítico en cards server + islas de gráfico.

### Síntesis de las dos observaciones (resuelta de forma coherente, no como dos parches)

Ambas apuntan al mismo sitio: **el store Zustand global compartido que proponía la versión anterior deja de ser necesario.** Dashboard es server sin store (observación 1); los cuatro editores ya persisten vía Server Actions (observación 2 = opción C, que es el estado actual del guardado), así que cada uno puede ser una isla client autónoma **sembrada por el fetch de su propio `page.tsx` server**, con su estado local + debounce + flush. La ganancia de rendimiento sigue viniendo de **una server page por sección + code-splitting por ruta** (Recharts solo en Dashboard/Patrimonio), y ahora además de **Dashboard casi sin JS** y de **no introducir Zustand** (nunca estuvo en el código). El coste es un matiz de coherencia (guardado con debounce vs. refetch al navegar) que se documenta en "Risks" y "Decisiones abiertas".

## Affected layers

- [ ] domain — sin cambios de entidades/VOs (salvo posible centralización de un default; ver Fase 3)
- [x] application — sin nuevos casos de uso; se reordena cómo los consumen las páginas (fetch por slice en vez de un único `LoadInitialAppState`)
- [ ] infrastructure — **sin cambios de esquema Turso ni migraciones**. Repositorios y gateways intactos
- [x] UI — cambio principal: routing App Router, división Server page / Client island (Dashboard a server + islas de gráfico; editores como islas autónomas con estado local), export a Server Action, extracción de componentes comunes, poda de tests. **Sin store global (revisado).**

## Hallazgos de investigación (base del plan)

- **No existe `CLAUDE.md`** en la raíz ni en `.claude/` (la lectura obligatoria falló). El único contrato vigente son las skills. **Riesgo documental**: conviene crear `CLAUDE.md` en otro momento; no forma parte de esta tarea.
- **No existe `src/store/` ni Zustand** pese a que `hexagonal-architecture` lo menciona. Hoy todo el estado vive en `useState` dentro de `FinanceAppShell` (`"use client"`), con 5 `useEffect` de auto-guardado con debounce (800 ms) y flush en `unmount`. **Decisión revisada (ver Architecture decisions): no se introduce Zustand.** El estado deja de ser global; cada isla editora mantiene su propio estado local sembrado por el fetch server de su ruta.
- **Guardado ya vía Server Actions.** `src/app/actions/{savePortfolio,saveDebts,saveBudget,saveGoalsSettings,saveWealthTargets}.ts` (`"use server"`), invocados desde los `useEffect` con debounce. `LoadInitialAppState` agrega los 5 loaders, pero `container` expone cada loader por separado (`loadPortfolio()`, `loadDebts()`, …), así que el fetch por slice por ruta es trivial.
- **Estado compartido entre secciones** (antes el punto más delicado; ahora se resuelve con fetch por ruta, no con store):
  - `portfolio` / `portfolioDerived` → lo leen Dashboard, Patrimonio, Deudas (solo `total`) y Metas.
  - `debts` → los leen Dashboard, Patrimonio y Deudas.
  - `budget`/`months` → Dashboard y Presupuesto.
  - `wealthTargets`, `goalsSettings` → Dashboard, Patrimonio, Metas.
  - **Con rutas reales, cada `page.tsx` server hace fetch solo de los slices que su sección lee** (p. ej. Deudas → `portfolio`+`debts`; Presupuesto → solo `budget`). La compartición se logra porque el guardado persiste vía Server Action y la siguiente ruta re-lee del servidor. El único punto que exige coherencia inmediata es la carrera debounce↔navegación (ver "Risks").
  - **Consumidor transversal en el chrome**: el export JSON/CSV (`SettingsMenu`) hoy lee el estado en memoria de las 5 slices. Sin store global, el chrome ya no tiene esos datos → convertir el export en un Server Action que carga todas las slices en servidor y devuelve el string serializado; el cliente solo dispara la descarga. Lee lo último guardado (≈ lo actual con autosave+flush). Ver "Decisiones abiertas".
- **Animaciones/estilos**: no hay Framer Motion (no está en dependencias). Todo es CSS en `src/app/AppStyles.tsx` (transitions `.15s/.2s`, `.tabbtn.on`, barras, roadmap) + `globals.css` + estilos inline. Para conservarlos, `AppStyles` debe seguir montado globalmente y las clases (`.card`, `.grid`, `.tabnav`, `.mobile-tabbar`, `.widget-*` de orden en móvil) deben preservarse intactas.
- **Yahoo**: `WealthTab.refreshPrices` hace `fetch("/api/prices")` con polling por intervalo; `WealthEvolutionChart` hace fetch al history. Ambos ya son la frontera correcta (Route Handler). No se toca.
- **Candidatos class-first / código muerto** (a verificar en ejecución, no fabricar):
  - `seriesColorAt` en `src/lib/theme.ts` es una arrow function exportada y compartida (Dashboard, Wealth, BudgetWorkspace). Tensión con class-first pero es helper puro de presentación; **aceptable** — no forzar clase artificial (YAGNI). Documentar y dejar.
  - Fallback duplicado `wealthTargets ?? WEALTH_TARGETS_INITIAL` en `DashboardSummaryCalculator` y `GoalsTab`. Candidato a centralizar (ver Fase 3).
  - Helpers locales privados en `DebtsSection` (`todayIsoDate`, `formatSettlementDate`) NO exportados → permitidos por class-first ("tiny pure local helpers private to one file").
  - **No** se detectaron constantes `*_INITIAL` muertas: `GOALS_SETTINGS_INITIAL` y `WEALTH_TARGETS_INITIAL` están en uso.
  - No hay herramienta de dead-code (knip/ts-prune) en `package.json`. La detección de código muerto se hará con grep dirigido + `pnpm build`/`pnpm lint`, no con suposiciones.
- **Componentes comunes extraíbles** (Fase 3):
  - `Metric` ya vive en `src/shared/ui/` y se reusa (Wealth, Debts) — precedente a seguir.
  - Patrón "empty state / onboarding CTA card" repetido en `BudgetOnboarding`, `GoalsSettingsOnboarding`, `WealthTargetsOnboarding` (misma estructura `.card` + título + inputs + botón "Crear…").
  - Patrón de "toast guardado" repetido (`SAVED_MESSAGE_DURATION_MS` en `DebtsSection`, mensajes de guardado en `BudgetWorkspace`, `BudgetMonthlyBreakdown`).
  - Cabecera (eyebrow + título de sección) y navegación (`tabnav` desktop + `MobileTabBar`) pasan a vivir en el layout compartido de rutas.

## Files to create/modify

> Rutas exactas por fase. Los nombres de carpeta siguen `hexagonal-architecture` (`src/app` para App Router, `src/shared/ui` para UI compartida). No se crea `src/store/` (decisión revisada: sin Zustand).

> Cambio de enfoque respecto a la versión anterior: **sin store Zustand global**. Cada `page.tsx` server hace fetch de sus slices y siembra una isla client autónoma (editores) o renderiza cards server + islas de gráfico (Dashboard). Fases 1 y 2 se funden parcialmente: al no haber store intermedio, el fetch por ruta se introduce ya en la Fase 1.

### Fase 1 — Routing real + frontera Server/Client por ruta (sin store global)

- `src/app/(app)/layout.tsx` — **crear**. Server Component: `requireUser()` (auth) y renderiza el chrome + `{children}`. Ya **no** hace el fetch de datos de negocio (eso pasa a cada `page.tsx`). La carpeta `(app)/` no existe hoy; se introduce aquí porque 5 rutas comparten header/nav/chrome (justifica el grupo).
- `src/app/(app)/AppChrome.tsx` — **crear**. Client Component (isla mínima): monta `AppStyles`, `header` (eyebrow + título derivado de `usePathname()`), `nav` desktop con `next/link`, `SettingsMenu`, `MobileTabBar` (adaptado a `<Link>`), y `{children}`. Persiste entre navegaciones (los layouts de App Router no se remontan). **No contiene estado de negocio.**
- `src/app/actions/exportFinanceData.ts` — **crear**. Server Action `"use server"` que carga las 5 slices vía `container` y devuelve `{ json, csv }` (o por formato) usando `financeDataExporter`. Reemplaza la lectura de estado en memoria que hoy hace el export del shell. `SettingsMenu` pasa a llamarlo y disparar la descarga con `browserFileDownloader`.
- `src/app/(app)/page.tsx` — **crear** (ruta `/`, Resumen). **Server Component**: fetchea las 5 slices que Dashboard lee, corre las calculadoras en servidor y renderiza las cards estáticas + monta las islas de gráfico. Ver Fase 2 (extracción de gráficos).
- `src/app/(app)/patrimonio/page.tsx` — **crear**. Server: `loadPortfolio` + `loadDebts` + `loadWealthTargets`; siembra `WealthTab` (isla) con props iniciales.
- `src/app/(app)/presupuesto/page.tsx` — **crear**. Server: solo `loadBudget`; siembra `BudgetTab` (isla).
- `src/app/(app)/deudas/page.tsx` — **crear**. Server: `loadPortfolio` (para `total`) + `loadDebts`; siembra `DebtsSection` (con el wrapper `.grid` actual).
- `src/app/(app)/metas/page.tsx` — **crear**. Server: `loadPortfolio` + `loadGoalsSettings` + `loadWealthTargets`; siembra `GoalsTab` (isla).
- `src/app/page.tsx` — **eliminar** (su contenido se reparte entre el layout de grupo y las páginas).
- `src/app/FinanceAppShell.tsx` — **eliminar** al final de la fase. Su chrome va al layout/`AppChrome`; su estado + los 5 `useEffect` de debounce se reparten **dentro de cada isla editora** (cada `*Tab` gestiona su propia slice + autosave + flush en unmount).
- `src/app/MobileTabBar.tsx` — **modificar**: los items pasan de `onSelect(tabId)` a navegación por `href` (`next/link`), marcando activo con `usePathname()`. Conservar clases CSS y los iconos exportados.
- `src/features/wealth/components/WealthTab.tsx`, `src/features/budget/components/BudgetTab.tsx`, `src/features/goals/components/GoalsTab.tsx`, `src/features/debts/components/DebtsSection.tsx` — **modificar firmas**: dejan de recibir `setX` por prop-drilling desde el shell. Cada uno recibe sus datos iniciales como props del server page y **internaliza** su `useState` + el `useEffect` de debounce que le corresponde (llamando su Server Action de guardado + flush en unmount). Sin cambios visuales.

### Fase 2 — Dashboard como Server Component + extracción de islas de gráfico

- `src/features/dashboard/components/DashboardTab.tsx` — **disolver**. Su cálculo (calculadoras de dominio) sube al `page.tsx` server; sus cards estáticas se renderizan en server; sus gráficos se extraen a islas client:
  - `src/features/dashboard/components/WealthCompositionChart.tsx` — **crear** (`"use client"`). Recibe `wealthComposition` (ya calculado con colores) y pinta el `PieChart`.
  - `src/features/dashboard/components/SurplusHistoryChart.tsx` — **crear** (`"use client"`). Recibe `surplusHistory` y pinta el `BarChart`.
  - `WealthEvolutionChart` ya es una isla client reutilizable — se monta directamente desde el server page pasándole `portfolio`/`total`/`liquidityTotal`.
  - Las cards (patrimonio neto, flujo, FI, fondo de emergencia, estados vacíos) quedan como JSX server en el `page.tsx` (o un `DashboardSummaryCards.tsx` server-only sin `"use client"`).
- `src/app/LoadInitialAppState.ts` — **evaluar eliminar**. Con fetch por slice en cada page y export como Server Action propio, el agregador monolítico deja de tener consumidores. Confirmar con grep antes de borrar; si algún test lo cubre, retirarlo con él (ver Fase 4). `src/app/LoadInitialAppState.unit.test.ts` se va con él.
- **Editores (Wealth/Budget/Goals/Debts)**: no se tocan más allá de la Fase 1 — se quedan como islas client con autosave por debounce vía Server Action (opción C, que ya es el estado actual). **No se aplica la opción B** (guardado explícito) por decisión; ver "Decisiones abiertas".

### Fase 3 — Limpieza de código y extracción de comunes

- `src/shared/ui/OnboardingCard.tsx` (o `EmptyStateCard.tsx`) — **crear**. Extrae el patrón común de las 3 onboardings. Cada onboarding concreta pasa a componer este contenedor.
- `src/shared/ui/SavedToast.tsx` — **crear** (si la duplicación de "toast guardado" lo justifica tras revisión). Centraliza `SAVED_MESSAGE_DURATION_MS` + render.
- `src/features/budget/components/BudgetOnboarding.tsx`, `src/features/goals/components/GoalsSettingsOnboarding.tsx`, `src/features/wealth/components/WealthTargetsOnboarding.tsx` — **modificar**: componer el nuevo `OnboardingCard`.
- Centralizar el default `?? WEALTH_TARGETS_INITIAL`: evaluar un accessor único (p. ej. método en un pequeño VO/servicio de `wealth`) consumido por `DashboardSummaryCalculator` y `GoalsTab`, en vez de repetir el fallback. Respeta DRY sin acoplar features de más.

### Fase 4 — Poda de tests

- `src/app/manifest.unit.test.ts` — **eliminar**. Sólo re-declara literales de config (name/short_name/display/start_url/icons); cero comportamiento. Relleno frágil.
- `src/app/FinanceAppShell.unit.test.tsx` — **eliminar/reescribir**. El componente desaparece. Las aserciones estructurales ("single main landmark", aria-selected de tabs) son de bajo valor. El comportamiento real que sí importa (export JSON/CSV, apertura del menú) ya está cubierto en `SettingsMenu.unit.test.tsx`; verificar cobertura y **no duplicar**. La navegación entre rutas se cubrirá, si acaso, con un test e2e (Playwright) ligero, no con unit del shell.
- `src/features/wealth/components/WealthTargetsOnboarding.unit.test.tsx` — **podar**: eliminar el test que consulta `container.querySelector(".card.span-full.widget-onboarding-cta")` (aserción por clase CSS: exactamente el antipatrón que el proyecto ya decidió borrar) y el "should not persist anything while rendering" (relleno). Conservar los que verifican que se crean/propagan los valores del formulario.
- `src/app/MobileTabBar.unit.test.tsx` — **revisar tras la Fase 1**: al pasar a `<Link>`, el test cambia de "onSelect callback" a "marca activo según ruta". Conservar la aserción de accesibilidad (tablist etiquetado, activo correcto); reescribir la de callback.
- `src/features/budget/components/BudgetTab.unit.test.tsx` — **conservar reformulando nombres**: las aserciones de rama (onboarding vs. registrar-mes vs. breakdown) y los updaters de `setMonths`/`setBaseBudget` son comportamiento real; sólo eliminar la retórica "should not crash".
- Barrido general de tests con criterio (ver "Testing strategy"). No borrar nada de dominio/aplicación/integración: son los de mayor valor.

## Implementation steps

1. **Preparación**: `pnpm test` y `pnpm build` en verde como base. Anotar el bundle actual de `/` como referencia de rendimiento (antes/después).
2. **Layout de grupo** (`src/app/(app)/layout.tsx` + `AppChrome.tsx`): mover `AppStyles`, header, nav desktop, `SettingsMenu` y `MobileTabBar`. Layout server solo con auth; **sin datos de negocio**. Convertir el export a Server Action (`exportFinanceData`) y cablear `SettingsMenu`.
3. **Islas editoras autónomas**: internalizar en `WealthTab`/`BudgetTab`/`GoalsTab`/`DebtsSection` el `useState` + el `useEffect` de debounce (800 ms + flush en unmount) que hoy viven en `FinanceAppShell`, cada uno con su Server Action de guardado. Cambian las firmas: reciben datos iniciales como props, ya no `setX` desde arriba.
4. **Cinco páginas** bajo `(app)/`: cada `page.tsx` server fetchea solo sus slices (`container.loadX()`) y siembra su isla. Dashboard, de momento, puede seguir montando el `DashboardTab` client tal cual (su conversión a server es el paso 6, Fase 2) para no acoplar dos cambios.
5. **Navegación**: `MobileTabBar` y nav desktop a `next/link` + `usePathname`; título de cabecera derivado de la ruta. Verificar que `.tabbtn.on`/activo se mantiene visualmente idéntico.
6. **Borrar** `src/app/page.tsx` y `src/app/FinanceAppShell.tsx`. Verificar app funcionando (ver skill `next-dev-loop`/`verify`): navegación, auto-guardado, polling de precios, export.
7. **Fase 2 (Dashboard server)**: subir las calculadoras a `(app)/page.tsx`, renderizar las cards en server, extraer `WealthCompositionChart`/`SurplusHistoryChart` como islas client; disolver `DashboardTab`. Evaluar/eliminar `LoadInitialAppState`. Revalidar coherencia al navegar (portfolio editado en Patrimonio → guardado → aparece en Resumen).
8. **Fase 3**: extraer `OnboardingCard` (y `SavedToast` si procede), recomponer las 3 onboardings, centralizar el fallback de `WEALTH_TARGETS_INITIAL`. Barrido de código muerto con grep + `pnpm lint`/`build`.
9. **Fase 4**: aplicar la poda de tests de la sección anterior. `pnpm test` en verde. Confirmar que no baja la cobertura de comportamiento real (sólo se van los de relleno).
10. **Cierre**: `pnpm build` + `pnpm test` + `pnpm test:e2e` (si aplica) verdes. Comparar bundle por ruta contra la referencia del paso 1.

## Testing strategy

- **Criterio de poda** (qué es "relleno" y se borra):
  - Tests que sólo re-declaran valores literales de configuración (`manifest`).
  - Aserciones por selector de clase CSS (`container.querySelector(".card...")`) — antipatrón ya rechazado en el proyecto.
  - "renders without crashing" / "should not persist while rendering" sin verificar comportamiento observable.
  - Tests de estructura DOM trivial (existe un `<main>`, existe un rol) que no prueban negocio.
  - Duplicados: comportamiento ya cubierto por otro test más específico (p. ej. export en shell vs. en `SettingsMenu`).
- **Criterio de conservación** (qué NO se toca):
  - **Dominio**: `PortfolioCalculator`, `PortfolioHistoryCalculator`, `MonthlyBudgetCalculator`, `MonthlyRecapCalculator`, `DebtLedger`, `DebtAmortizationProjector`, `NetWorthCalculator`, `WealthThresholdEvaluator`, `FinancialProjectionCalculator`, etc. — máximo valor, se mantienen.
  - **Aplicación**: casos de uso con mock del puerto (`SaveBudget`, `RefreshPositionPrices`, `ComputePortfolioHistory`, …).
  - **Integración Turso**: todos los `*.integration.test.ts` (repositorios contra libSQL local real) — se mantienen. **Esta tarea no cambia esquema ni repos**, así que no requieren cambios.
  - **Componentes con comportamiento**: los que consultan por rol semántico y verifican ramas/valores (Budget branches, DebtsSection, DashboardTab con datos).
- **Tests nuevos/ajustados por el routing** (sin store → no hay "Zustand Store Tests" que escribir):
  - Autosave por isla: verificar en cada `*Tab` que editar dispara su Server Action tras el debounce y que el flush en unmount la invoca (mockear el action + timers falsos). Es el comportamiento que antes vivía en el shell.
  - `exportFinanceData` (Server Action): unit con mock del `container` que confirme que serializa las 5 slices vía `financeDataExporter`.
  - Navegación entre rutas: preferible un e2e ligero de Playwright (ya hay `e2e/` y `test:e2e`) que unit del layout, porque la navegación App Router es difícil de probar de forma fiel en jsdom. Incluir un caso de coherencia: editar en Patrimonio → navegar a Resumen → ver el valor guardado.
- **Integración**: sin nuevos tests de repositorio (no hay cambios de infraestructura). Los existentes deben seguir verdes.

## Architecture decisions

- **Sin store global; estado local por isla sembrado por fetch server por ruta (decisión revisada).** La versión anterior proponía un Zustand global hidratado en el layout. Reevaluado con el código real, **no hace falta**: (a) Dashboard es de solo lectura y no necesita estado compartido; (b) los editores ya persisten vía Server Actions, así que cada ruta puede re-leer del servidor lo último guardado. Cada `page.tsx` server fetchea solo sus slices y siembra su isla; cada isla editora mantiene su `useState` + debounce + flush localmente. Se evita introducir una dependencia (Zustand) que nunca estuvo en el código (YAGNI) y se maximiza el code-splitting y el server-rendering. **Trade-off asumido**: la compartición entre secciones pasa de "instantánea en memoria" a "eventual vía guardado + refetch al navegar"; se cubre el hueco con flush-on-navigate (ver "Risks"). `hexagonal-architecture` menciona `src/store/` como forma *sugerida*, no contrato; su ausencia aquí es coherente con "no scaffolding especulativo".
- **Dashboard como Server Component real; editores como islas client.** Dashboard cumple literalmente "cada sección es una server page": el `page.tsx` fetchea, corre las calculadoras de dominio en servidor y renderiza cards estáticas server + islas de gráfico. Los cuatro editores son Server page fina (fetch) + isla client (edición). No se fuerzan Server Components donde hay edición/gráficos vivos (sería falso y rompería Recharts/estado). Respeta la regla hexagonal "Client Components never touch infrastructure": las páginas server resuelven casos de uso vía `container`; las islas reciben datos ya cargados y llaman Server Actions.
- **Guardado: opción C (Server Action + debounce client), que ya es el estado actual.** Se mantiene el auto-guardado mientras se teclea (UX ya validada por el usuario) sobre las Server Actions existentes. No se migra a guardado explícito (opción B) porque cambiaría UX visible; queda como pregunta abierta. El `/api/prices*` (lectura Yahoo con polling) sigue como Route Handler.
- **Sin tocar dominio/infra.** La tarea es de organización UI + tests; entidades, VOs, repositorios, gateways, esquema Turso y migraciones quedan intactos. Se preserva la dependencia hacia dentro.
- **class-first pragmático.** No se crean clases artificiales para helpers puros de presentación (`seriesColorAt`) ni para helpers locales privados. Sí se encapsulan patrones repetidos de UI en componentes nombrados (`OnboardingCard`), que es composición de componentes, no lógica de negocio suelta.
- **Fases pequeñas y verificables** (como en `PLAN-analisis-producto-mejoras.md` con Fase 1/2a/2b), porque el cambio de routing es estructural y de alto riesgo de regresión visual/funcional. Cada fase deja la app en verde y navegable.

## Decisiones abiertas para el usuario

> Estas alteran comportamiento visible o son bifurcaciones de arquitectura que NO deben asumirse sin visto bueno. El resto del plan es aplicable tal cual.

1. **¿Guardado explícito (opción B) en algún editor?** — *Recomendación: NO, mantener autosave (opción C).* La opción B (guardar en `onBlur` o botón "Guardar" por fila/sección con `<form action={serverAction}>`) permitiría que más árbol fuese Server Component, pero **cambia la UX**: deja de auto-guardarse mientras se teclea, que es un comportamiento ya en producción y validado por el usuario. Como los editores son casi 100% interactivos, el ahorro de client sería marginal y el coste de UX real. Se deja como pregunta abierta solo por completitud; no se aplica salvo que el usuario lo pida.
2. **¿Quitar el store global o conservar uno como plan B?** — *Recomendación: quitarlo (no introducir Zustand).* El plan por defecto elimina la idea del store global: fetch por ruta + islas locales + Server Actions. La consecuencia visible es que la reflexión de un dato editado en otra sección pasa de instantánea (memoria) a eventual (al navegar, recarga server). Si el usuario nota o rechaza ese matiz, el plan B conservador es reintroducir un Zustand global en el layout (como proponía la versión anterior) a cambio de mantener todo client y renunciar a Dashboard-server. **No se puede tener Dashboard-server y reflexión-instantánea-en-memoria a la vez**; hay que elegir. Recomendación: Dashboard-server + eventual, que es lo más limpio.
3. **Export lee lo último guardado, no ediciones en vuelo.** Al pasar el export a Server Action, exportará el estado persistido. Con autosave+flush la diferencia es sub-segundo, pero si el usuario espera "exportar exactamente lo que veo aunque no se haya guardado", habría que forzar un flush previo o mantener el export en cliente. *Recomendación: Server Action con flush previo; confirmar que es aceptable.*

## Risks and dependencies

- **Riesgo alto: carrera guardado-con-debounce ↔ navegación (nuevo núcleo tras quitar el store).** Sin store global, editar en una sección se refleja en otra vía guardado + refetch al navegar. Si el usuario edita y navega antes de que el debounce (800 ms) dispare, la siguiente ruta podría re-leer un valor obsoleto. **Mitigación**: flush síncrono del guardado pendiente al desmontar la isla (ya existe el patrón de flush-en-unmount en `FinanceAppShell`; se conserva por isla) y, si hace falta, `await` del Server Action antes de permitir la navegación / `router.refresh()`. Verificar manualmente: editar en Patrimonio → ir a Resumen/Metas → el valor guardado aparece. En la práctica la ventana de inconsistencia es sub-segundo y el destino es una página nueva que carga fresca del servidor.
- **Reflexión cross-section: de instantánea a eventual.** Con el shell actual, editar `portfolio` en Patrimonio se refleja al instante en cualquier tab en memoria. Con rutas + fetch por slice, se refleja al **navegar** (nueva carga server desde DB). Es un cambio de comportamiento sutil, casi invisible (navegar ya implica cargar otra vista), pero se documenta como "Decisión abierta" por si el usuario prefiere conservar el store global como plan B conservador.
- **Export desde el chrome.** Al vivir `SettingsMenu` en el layout persistente sin estado de negocio, el export deja de leer memoria y pasa a Server Action (`exportFinanceData`) que lee lo último guardado. Riesgo menor: si hay ediciones sin flush, el export las omitiría; mitigado por autosave+flush. Ver "Decisiones abiertas".
- **Riesgo de regresión visual.** Conservar `AppStyles` montado globalmente y **todas** las clases (`.tabbtn.on`, `.mobile-tabbar`, `.widget-*` de orden móvil, `.grid`, `.card`). El estado activo de la pestaña pasa de `aria-selected`/`.on` por `useState` a derivarse de `usePathname()`; verificar que el resaltado es idéntico.
- **Polling de precios (`WealthTab`).** Al montarse sólo en `/patrimonio`, el intervalo arranca/para con la ruta (mejora: no hace polling cuando no estás en Patrimonio). Verificar que no rompe el refresco esperado y que el `WealthEvolutionChart` sigue pintando el histórico.
- **`CLAUDE.md` inexistente.** La instrucción pedía leerlo; no existe. No bloquea esta tarea, pero conviene crearlo por separado. Documentado como deuda.
- **Sin herramienta de dead-code.** La limpieza se apoya en grep dirigido + `pnpm lint`/`pnpm build`; no inventar código muerto. Considerar (fuera de alcance) añadir `knip` en el futuro.
- **Orden de ejecución**: 1) layout+chrome (auth + navegación, sin datos) + export como Server Action → 2) las 5 páginas server con fetch por slice, internalizando estado+debounce en cada isla editora → 3) navegación `next/link`+`usePathname` → 4) borrar `page.tsx`/`FinanceAppShell` antiguos → 5) Dashboard a Server Component + extraer islas de gráfico (Fase 2) → 6) extraer comunes (Fase 3) → 7) podar tests (Fase 4). Cada paso con `pnpm test`/`pnpm build` verdes antes de avanzar.
- **Gestor de paquetes**: siempre `pnpm` (nunca `npm`/`npx`).
