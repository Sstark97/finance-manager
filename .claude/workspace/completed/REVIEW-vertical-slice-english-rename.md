# Review: Vertical slice + traducción a inglés + resolución de 3 avisos

## Verdict: PASS

Revisión de `git diff 7ecfb99..HEAD` contra `PLAN-vertical-slice-english-rename.md`. Los tres frentes (3 avisos, traducción de identificadores, reorganización a vertical slice) se cumplen según la vara de medir del plan. Sin hallazgos bloqueantes.

## Blocking findings
Ninguno.

## Verificaciones realizadas

### 1. Línea de corte de traducción (consistente)
- Identificadores traducidos correctamente: clases (`PortfolioCalculator.derive`, `MonthlyBudgetCalculator.calculate`, `FinancialProjectionCalculator.project`), tipos, props, seeds, config, funciones (`createMonth`/`monthKey`/`isMonthAvailable`), shell (`FinanceApp`, `TabId` con valores `wealth/budget/goals`).
- Valores de unión discriminante correctamente **en español**: `PositionType` (`fondo/etf/cripto/efectivo`), `PositionGroup` (`rv/btc/liquidez`), `CategoryId` (`gastosFijos/…`), `CategoryType` (`gasto/ahorro`), `EventCategory` `"ingreso"`. Ids de entidad en español (`world/em/nasdaq/btc/liquidez`, `coche/applewatch/kindle/ledger`).
- Caso documentado de `Budget`: tipo en inglés con propiedades en español (`ingresoNeto, gastosFijos, …`) — presente en `budget/domain/types.ts:35-42` y consumido dinámicamente vía `baseBudget[category.id]` en `BudgetTab.tsx`. Coherente con la decisión del plan; `EditableBudgetField = "ingresoNeto" | CategoryId` mantiene la coherencia. No es hallazgo.
- Sweep de identificadores españoles (`derivar/calcular/proyectar/nombre/importe/categoria/salarioMin/…`): único hit es texto de UI visible (`WealthTab.tsx:160`), correcto.

### 2. dataKey/nameKey de recharts (sincronizados)
- `PortfolioHistoryPoint.label` ↔ `PRICE_HISTORY_INITIAL` usa `{ label, total }` ↔ `<XAxis dataKey="label">` y `<Line dataKey="total">` (WealthTab.tsx:299,302). ✓
- `CompositionItem {name,value}` ↔ `<YAxis dataKey="name">` + `<Bar dataKey="value">` (WealthTab.tsx:338,340). ✓
- `portfolioPie`/`baseDonutData` `{name,value}` ↔ `dataKey="value" nameKey="name"`. ✓
- `monthChartData` `{name, Presupuestado, Real}` ↔ `<XAxis dataKey="name">` + `<Bar dataKey="Presupuestado">`/`<Bar dataKey="Real">` (BudgetTab.tsx:350,354-355). `"Presupuestado"`/`"Real"` **preservados en español** como labels de Legend. ✓
- `annualEvolution` claves internas traducidas (`month/savingsBudgeted/savingsActual/expenseBudgeted/expenseActual`) con `dataKey` sincronizados y `name="…"` en español en las Line. ✓

### 3. Resolución real de los 3 avisos
- **1a**: `lib/format.ts` sanea NaN/Infinity con `const safe = (value) => Number.isFinite(value) ? value : 0` aplicado en `formatEuro`/`formatEuroWithCents`/`formatPercent`. ✓
- **1b**: `PortfolioDerived`/`PortfolioCalculator` sin `color` ni `pieCartera`; el dominio no importa `@/lib/theme` (100% puro). El pie se deriva en `WealthTab.tsx:90-92` coloreando por índice original y filtrando `value>0` después (fiel al comportamiento). Test lo blinda (`PortfolioCalculator.unit.test.ts:81-86`). ✓
- **1c**: `YahooPriceGateway.ts` vive en `features/wealth/infrastructure/`, exporta `fetchYahooPrice`. Consumido solo por WealthTab. ✓ (Deuda de regla hexagonal 5 —client importa infra— reconocida en el plan como localizada, no eliminada; aceptable en el scope acordado.)

### 4. Cohesión de capas del vertical slice
- `grep` confirma que ningún `features/*/domain/` ni `shared/domain/` importa `react`/`recharts`/`next`. ✓
- DAG respetado sin ciclos: `goals` importa de `wealth` (`PortfolioDerived`, `TARGETS`) y de `shared` (`Debt`); `budget` aislado; `wealth` solo de `shared`. ✓
- Sin uso de `any` en `src/` (fuera de tests, y tampoco en tests). ✓

### 5. Preservación del comportamiento (BudgetTab)
- Comparado `BudgetTab.tsx:86-103` contra `7ecfb99:PresupuestoTab.tsx`: el patrón de derivación-en-render (`effectiveMonthId`, y el bloque `if (month.id !== syncedMonthId) { setSyncedMonthId; setDraft; setSaved(false) }` durante el render, sin `useEffect`) se preservó **verbatim**, solo con identificadores renombrados. No se "arregló" al vuelo. ✓
- `useMemo` conservados; comentarios `why` sobre la derivación en render mantenidos.

### 6. Carpetas viejas eliminadas
- `grep` sin imports a `@/domain`, `@/data`, `@/components`, `@/infrastructure`. ✓
- `src/domain`, `src/data`, `src/components`, `src/infrastructure` ya no existen. ✓

## Warnings (non-blocking)
- `src/features/wealth/domain/PortfolioCalculator.ts:24-25` y `src/features/budget/domain/MonthlyBudgetCalculator.ts:20,25` — usan `|| 0` en vez de `??` sobre campos numéricos. Es código preexistente preservado verbatim y con intención deliberada (tratar NaN/valor inválido como 0, no solo null/undefined); cambiar a `??` alteraría el comportamiento. Se deja como nota, no como bloqueo.
- `src/features/*/domain/*.ts` singletons exportados a nivel de módulo (`export const portfolioCalculator = new PortfolioCalculator()`). No es composition-root estricto, pero es el patrón preexistente del split previo bajo la decisión YAGNI (sin DI todavía). Consistente con el plan.
- `src/app/page.tsx:95-96` — palabra partida "aseso ramiento" en el footer (JSX colapsa el salto de línea a un espacio). **Preexistente en `7ecfb99`**, no es regresión de esta tarea y queda fuera de scope (texto de UI). Se anota por si se quiere corregir aparte.

## Positive points
- Traducción exhaustiva y consistente con la línea de corte del plan; los valores acoplados a datos/seed y todo el texto de UI quedan intactos, evitando romper índices dinámicos y el fallback `CATEGORY_LABEL[event.category] || event.category`.
- Dominio 100% puro tras el aviso 1b; el color de presentación queda donde corresponde (UI), con test que impide la regresión.
- DAG entre slices limpio y acíclico; cada slice autocontenido con sus capas internas.
- Sincronización cuidadosa de los `dataKey`/`nameKey` de recharts, incluida la preservación deliberada de `Presupuestado`/`Real` como labels visibles.
- Patrón de render delicado de BudgetTab copiado verbatim, sin introducir `useEffect`.
- Tests de dominio siguen las convenciones (`describe("ClassName")` + `it("should …")`), instancian el dominio real sin mocks, y añaden la aserción que documenta la resolución del aviso 1b.
