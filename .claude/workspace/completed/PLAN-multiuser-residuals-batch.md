# Plan: Corregir 4 residuos de diseño del usuario original (app multiusuario real)

## Goal
La app pasó de un seed hardcodeado de un único usuario ("Aitor") a datos reales
multiusuario. Cuatro puntos siguen atados a ids mágicos o a conceptos personales de aquel
usuario y se comportan mal (o muestran contenido ajeno) para cualquier usuario nuevo. Se
corrigen los cuatro respetando hexagonal + class-first + code-semantic, y cuidando que la
producción YA tiene datos (migraciones no destructivas).

## Affected layers
[x] domain  [x] application (solo tipos/puertos vía firmas)  [x] infrastructure  [x] UI

- Bug 1 (renta variable / composición): domain + infrastructure (schema, mapper, migración) + UI.
- Bug 2 (eventos → Real): domain + UI.
- Bug 3 (editar/eliminar deuda): UI (sin backend; `saveAll` ya reemplaza la lista).
- Bug 4 (coche / Apple Watch): domain (GoalsSettings) + infrastructure (schema, mapper, migración) + UI.

Nota de arquitectura: la estructura hexagonal por feature ya existe y es la correcta para
esta tarea. No hace falta introducir carpetas nuevas. Ninguna de las correcciones cruza un
límite que hoy no esté ya modelado (los mappers y puertos existentes son los puntos de cambio).

---

## Bug 1 — `equityIndex` explícito en `Position` en lugar de ids mágicos

### Diagnóstico confirmado en el código
- `PortfolioCalculator.equityWeightOf(id)` (`PortfolioCalculator.ts:34-37`) busca `equityItems.find(item => item.id === id)`, es decir, casa solo con posiciones cuyo `Position.id` sea literalmente `"world"/"em"/"nasdaq"` (el seed original).
- `WealthTab.tsx` depende de esos ids en: `equityRows` (184-188) + `equityWeightOf("world"/"em"/"nasdaq")` en `alerts` (85) y `score` (97); `exists` de las barras real-vs-objetivo (442); y `compositionKeys` para `COMPOSITIONS` (112).
- `addPosition` (121-125) genera `id: idGenerator.generate()` (aleatorio) y el editor **no** permite indicar el índice → una posición real nunca casa. `COMPOSITIONS` (`config.ts`) está indexado por esos mismos ids.
- Persistencia: `PositionRowMapper` es el ÚNICO punto de mapeo (usado por `TursoPortfolioRepository.saveAll/findAll`). Autoguardado ya cableado en `FinanceAppShell.tsx:73`.

### Decisión de diseño
Añadir a `Position` un campo semántico **`equityIndex: EquityIndexKey | null`** donde
`EquityIndexKey = "world" | "em" | "nasdaq"`. Nombre elegido `equityIndex` (no `indexKey`)
porque expresa la intención de negocio: "qué índice de renta variable replica este fondo".
`null` = no asignado / no aplica (cripto, efectivo, o fondo sin clasificar).

`equityWeightOf` pasa a **sumar** el valor de TODAS las posiciones de RV con ese `equityIndex`
(no una sola por id), lo que además soporta varios fondos apuntando al mismo índice.

### Files to create/modify
- `src/features/wealth/domain/types.ts` — añadir `export type EquityIndexKey = "world" | "em" | "nasdaq";` y `equityIndex: EquityIndexKey | null` en `Position`.
- `src/features/wealth/domain/config.ts` — tipar `COMPOSITIONS` como `Record<EquityIndexKey, Composition>`; eliminar el comentario obsoleto "Clave = id de la posición" (code-semantic: la clave la expresa el tipo).
- `src/features/wealth/domain/PortfolioCalculator.ts` — `equityWeightOf(equityIndex: EquityIndexKey): number` sumando `equityItems.filter(item => item.equityIndex === equityIndex)`; actualizar el tipo en `PortfolioDerived`.
- `src/features/wealth/components/WealthTab.tsx`:
  - `compositionKeys` (112) y `exists` (442): filtrar por `position.equityIndex === key`.
  - `addPosition` (121-125): incluir `equityIndex: null`.
  - `editPosition` type change (117-119): al cambiar `type` a `cripto`/`efectivo`, poner `equityIndex: null`.
  - Editor de cartera: para `fondo`/`etf` añadir un `<select>` "Índice" con opciones World/Emergentes/Nasdaq/Ninguno; para `cripto`/`efectivo` no mostrarlo. Nuevo handler `setPositionEquityIndex(id, value)` (separado de `editPosition`, que hace branching string/number y no cubre un enum nullable).
  - `equityRows`/`alerts`/`score`: sus claves ya son literales `world/em/nasdaq`; solo tiparlas como `EquityIndexKey` al pasarlas a `equityWeightOf`.
- `src/features/wealth/infrastructure/PositionRowMapper.ts` — `toDomain`: `equityIndex: (row.equityIndex as EquityIndexKey | null) ?? null`; `toRow`: `equityIndex: position.equityIndex`.
- `src/infrastructure/db/schema.ts` — en `positions`: `equityIndex: text("equity_index")` (nullable, sin `.notNull()`).

### Migración (Bug 1)
`ALTER TABLE positions ADD COLUMN equity_index text;` — columna **nullable**, segura para las
posiciones ya existentes en producción (quedan con `NULL` = sin clasificar). Se genera con
`pnpm db:generate` (nunca a mano). Ver sección "Migraciones" al final: se genera junto con Bug 4.

### Testing (Bug 1)
- `PortfolioCalculator.unit.test.ts`: añadir `equityIndex` a las fixtures; reescribir los tests de `equityWeightOf` para usar `equityIndex` en vez de id; añadir test "should sum several equity positions that track the same index"; el test "id not part of the portfolio" pasa a "returns 0 for an index that no position tracks".
- `PositionRowMapper.unit.test.ts`: añadir `equity_index` al round-trip (con valor y con `null`).
- `TursoPortfolioRepository.integration.test.ts`: las posiciones llevan `equityIndex`; asertar que persiste y se recupera (incluyendo `null`).
- `WealthTab.unit.test.tsx`: añadir un fondo con `equityIndex: "world"` e `id` aleatorio y comprobar que la barra "real vs objetivo" de World deja de estar al 0% / atenuada; comprobar que el editor muestra el selector de índice para fondo/etf. (Recharts: asertar por texto de porcentaje, nunca por internals del gráfico.)

---

## Bug 2 — Los eventos del mes suman a Real, no a Presupuestado

### Diagnóstico confirmado
- `MonthlyBudgetCalculator.ts:21`: `values[category.id] = baseTarget + categoryEventsAmount` → los eventos inflan lo Presupuestado.
- `actual[cat]` (29-33) = valor manual `month.actual[cat]` (`null` = "sin registrar"), y está **enlazado directamente al input "Real"** del desglose (`BudgetMonthlyBreakdown.tsx:157 value={actualValue ?? ""}`). Por eso NO se puede sobrecargar `actual` con eventos: rompería la edición manual.
- `totalActual` (34-37) NO se consume en producción (solo en su propio test). El calculador solo se usa en `BudgetMonthlyBreakdown.tsx` (43, 54, 93).

### Decisión de diseño (semántica de producto ya fijada: evento = gasto real puntual)
1. `values[cat] = base/override` **sin eventos** → "Presupuestado" refleja solo el plan.
2. Nuevo campo expuesto **`realized: Record<CategoryId, number | null>`** = "Real efectivo":
   - `categoryEvents` = suma de eventos de la categoría.
   - registrado si `manualActual != null` **o** `categoryEvents > 0`.
   - valor = registrado ? `(manualActual ?? values[cat]) + categoryEvents` : `null`.
   - (si el usuario no registró el manual pero hubo eventos, se asume el plan ejecutado como base y se suman los eventos reales encima — decisión documentada; alternativa descartada: contar solo los eventos, que infravalora el gasto planificado).
3. `actual[cat]` se mantiene = valor manual nullable (sigue enlazado al input, semántica "sin registrar" intacta).
4. `income` con eventos `ingreso` (23-26): sin cambios (no es "Presupuestado" de categoría).
5. `totalActual` = `sum(realized[cat] ?? values[cat])` → total real con fallback al plan cuando no hay nada registrado.

Nombre `realized` (frente a `actualWithEvents`) por concisión y por expresar "gasto realizado".

### Files to create/modify
- `src/features/budget/domain/MonthlyBudgetCalculator.ts` — quitar eventos de `values`; añadir `realized` a `MonthlyBudgetResult` y su cálculo; recalcular `totalActual` sobre `realized`.
- `src/features/budget/components/BudgetMonthlyBreakdown.tsx`:
  - `monthChartData.Real` (89): `result.realized[cat] ?? result.values[cat]`.
  - Fila por categoría (137-163): el input "Real" (157) sigue enlazado al **manual** (`draft.actual?.[cat] ?? ""`); `isRegistered` y `delta` pasan a usar `draftResult.realized[cat]` (coherencia con la barra "Real" y con que los eventos ya son gasto real).
  - `annualEvolution` (92-101): usar `monthResult.realized.*` (y sus flags de "registrado") en vez de `monthResult.actual.*`.

### Testing (Bug 2)
- `MonthlyBudgetCalculator.unit.test.ts`:
  - Reescribir "should add up events ... on top of its target": ahora `values.ocio === base.ocio` (plan intacto) y `realized.ocio === base.ocio + 40 + 15`.
  - Añadir: `realized` es `null` cuando no hay manual ni eventos; combina manual + eventos cuando hay ambos; usa `values` como base cuando hay eventos pero no manual.
  - Actualizar los dos tests de `totalActual` a la nueva base (`realized`).
- Añadir test de componente ligero para `BudgetMonthlyBreakdown` (no existe hoy): un evento incrementa "Real"/"vs plan" pero NO el "Total presupuestado" de la categoría. Asertar por el texto `Total presupuestado: …` y el `+X vs plan`, no por el gráfico.

---

## Bug 3 — Deudas: editar nombre (y nota) + eliminar

### Diagnóstico confirmado
- `GoalsTab.tsx`: `editDebt` (51) solo cubre numéricos (`parseFloat`); `debt.name` se pinta como texto (162) y `debt.note` idem (163). Único botón: "Liquidar" (`markSettled`, 52, pone balance 0 pero conserva la fila). No hay borrado.
- Backend: `saveDebts` → `SaveDebts.invoke` → `DebtRepository.saveAll(userId, debts)` reemplaza toda la lista del usuario; autoguardado en `FinanceAppShell.tsx:85`. **No requiere cambios de backend**: filtrar la deuda del array y dejar que `saveAll` la borre.

### Files to modify
- `src/features/goals/components/GoalsTab.tsx`:
  - Editar el `EditableDebtField`/handler para distinguir texto (`name`, `note`) de numérico (`installment`, `balance`): seguir el patrón de branching de `editPosition` en `WealthTab.tsx`. P.ej. `editDebtText(id, field, value)` y `editDebtNumber(id, field, value)`, o un único `editDebt` que ramifica por campo.
  - Sustituir el `<div>` del nombre (162) por un `<input>` enlazado a `name`; valorar input para `note` (recomendado: sí, misma sección, misma UX que WealthTab).
  - Añadir `removeDebt(id)` = `setDebts(list => list.filter(debt => debt.id !== id))` (espejo de `removePosition`) y un botón "Eliminar" por fila, separado de "Liquidar".

### Testing (Bug 3)
- `GoalsTab.unit.test.tsx`: añadir tests "editar nombre llama a setDebts con el nombre nuevo" (query por rol/label del input) y "el botón Eliminar filtra la deuda". Mantener el estilo de aserción sobre el updater de `setDebts` ya usado en el test de "+ Añadir deuda".

---

## Bug 4 — Eliminar el concepto "coche" (countCar) y el banner "Apple Watch"

### Diagnóstico confirmado
- `countCar` recorre: `GoalsSettings` (interface), `GoalsSettingsRowMapper` (18, 31), `schema.ts:146` (`count_car`), `goalsSettings.ts` (data), `GoalsSettingsOnboarding.tsx` (state + checkbox 65), `GoalsTab.tsx` (36, 42, 46-49, 152-153, 179). El cálculo `netWorth = countCar ? total - debtWithoutCar : total - totalDebt` depende de `debts.find(id === "coche")` (id mágico del seed ya borrado).
- `appleWatchDaysLeft` + banner: `GoalsTab.tsx:55-59, 79-89` y también `WealthTab.tsx:68-73` (cálculo) + `77-78` (alerta), con id mágico `"applewatch"` y fecha "10 de julio" hardcodeada.
- No hay evidencia de necesidad real de excluir una deuda concreta del patrimonio neto → **YAGNI: se elimina, sin toggle ni generalización**.

### Files to modify
- `src/features/goals/application/GoalsSettings.ts` — quitar `countCar`.
- `src/features/goals/infrastructure/GoalsSettingsRowMapper.ts` — quitar mapeo `countCar`/`count_car`.
- `src/infrastructure/db/schema.ts` — quitar la columna `countCar`/`count_car` de `goalsSettings`.
- `src/features/goals/data/goalsSettings.ts` — quitar `countCar`.
- `src/features/goals/components/GoalsSettingsOnboarding.tsx` — quitar state `countCar`, su checkbox (58-66 zona) y el campo del objeto `onCreateSettings`.
- `src/features/goals/components/GoalsTab.tsx`:
  - `netWorth = total - totalDebt`; eliminar `carDebt`, `debtWithoutCar`, `countCar`, `setCountCar`.
  - Quitar el checkbox "Contar el coche…" (151-154) y simplificar el `sub` del Metric "Patrimonio neto" (179).
  - Eliminar `appleWatchDaysLeft` (55-59) y todo el bloque del banner (79-89).
- `src/features/wealth/components/WealthTab.tsx` — eliminar `appleWatchDaysLeft` (68-73) y su `push` en `alerts` (77-78).

### Migración (Bug 4)
Eliminar `count_car` de `goals_settings`. En SQLite drizzle-kit genera un **recreate** de tabla
(crear nueva sin la columna, copiar datos, drop, rename) preservando la FK a `user`. Es seguro
para producción: solo descarta ese booleano; el resto de columnas se copian. Se genera con
`pnpm db:generate`.

### Testing (Bug 4)
Quitar `countCar` de todas las fixtures/aserciones:
- `GoalsTab.unit.test.tsx` (17, 60, 88): fixtures sin `countCar`; el test de onboarding confirmado (58-61) debe esperar el objeto **sin** `countCar`.
- `GoalsSettingsOnboarding` implícito vía GoalsTab.
- `GoalsSettingsRowMapper.unit.test.ts` (9, 15, 26).
- `LoadGoalsSettings.unit.test.ts` (22), `SaveGoalsSettings.unit.test.ts` (26).
- `TursoGoalsSettingsRepository.integration.test.ts` (28, 40, 54, 58).
- `src/app/LoadInitialAppState.unit.test.ts` (16). (La fixture de `debts` con `id: "coche"` en 11 puede quedarse: ya no tiene significado especial; opcional renombrar a un id neutro.)

---

## Implementation steps (orden recomendado)
1. **Bug 4 primero** (elimina superficie): quitar `countCar` de domain/mapper/data/onboarding/GoalsTab y los banners Apple Watch de GoalsTab + WealthTab. Editar `schema.ts` (quitar `count_car`).
2. **Bug 1 schema**: añadir `equity_index` (nullable) a `positions` en `schema.ts`.
3. `pnpm db:generate` **una sola vez** tras los pasos 1-2 → una migración `0002_*` con: `ADD COLUMN equity_index` + recreate de `goals_settings`. Revisar el SQL generado (no editar a mano); confirmar que el recreate copia datos y conserva la FK.
4. **Bug 1 dominio + mapper + UI**: `types.ts`, `config.ts`, `PortfolioCalculator.ts`, `PositionRowMapper.ts`, editor y cálculos de `WealthTab.tsx`.
5. **Bug 2**: `MonthlyBudgetCalculator.ts` (values sin eventos + `realized`), luego `BudgetMonthlyBreakdown.tsx` (charts + fila + annualEvolution).
6. **Bug 3**: inputs de nombre/nota + `removeDebt` en `GoalsTab.tsx`.
7. Actualizar/añadir todos los tests indicados por bug.
8. `pnpm test` (unit + integration) y `pnpm lint`.

## Testing strategy
- **Unit (domain)**: `PortfolioCalculator` (equityIndex, suma por índice), `MonthlyBudgetCalculator` (values sin eventos, `realized`, `totalActual`).
- **Unit (infra/mappers)**: `PositionRowMapper` (equity_index nullable), `GoalsSettingsRowMapper` (sin countCar).
- **Integration (Turso, libSQL local real)**: `TursoPortfolioRepository` (equity_index round-trip incl null), `TursoGoalsSettingsRepository` (sin count_car).
- **Component (RTL, roles/labels)**: `WealthTab` (selector de índice + barra real-vs-objetivo por equityIndex), `BudgetMonthlyBreakdown` (evento → Real sube, Presupuestado no), `GoalsTab` (editar nombre + eliminar deuda; ausencia de checkbox coche y de banner Apple Watch).

## Architecture decisions
- **class-first / hexagonal**: toda la lógica sigue en clases de dominio (`PortfolioCalculator`, `MonthlyBudgetCalculator`) y en mappers de infraestructura; el punto único de mapeo fila↔dominio (`PositionRowMapper`, `GoalsSettingsRowMapper`) absorbe los cambios de schema. Sin funciones sueltas nuevas exportadas como API de feature.
- **code-semantic / YAGNI**: `equityIndex` (nombre de negocio) sustituye al acoplamiento por id; se elimina `countCar`/Apple Watch en vez de generalizarlos (sin evidencia de uso). Se retira el comentario obsoleto de `config.ts` codificando la clave vía tipo.
- **Persistencia segura en prod**: columna nueva **nullable** (Bug 1) y drop vía recreate estándar (Bug 4); ninguna operación destruye datos no relacionados. Nada de reset de esquema.
- **Bug 3 sin backend**: `saveAll` reemplaza la lista completa del usuario, así que filtrar en cliente basta para borrar.

## Risks and dependencies
- **Firma de `equityWeightOf`** cambia de `(id: string)` a `(equityIndex: EquityIndexKey)`: propaga a `alerts`/`score`/`equityRows` en `WealthTab` (claves ya son literales válidos). Type-check lo cubre.
- **Input "Real" del desglose (Bug 2)**: NO enlazar a `realized` (mostraría plan+eventos y rompería la edición). Debe seguir enlazado al valor manual `actual`. Punto crítico.
- **Migración combinada (paso 3)**: verificar el recreate de `goals_settings` (FK a `user`, copia de filas). El `positionTransactions.position_id` referencia `positions.id` (no afectado por `ADD COLUMN`).
- **DB dev/test efímera** pero **prod con datos**: no ejecutar resets; aplicar solo la migración generada.
- **Suciedad de tests**: hay muchas fixtures con `countCar` y con ids `"coche"/"applewatch"`; barrer todas (lista en cada bug) para que el suite compile y siga siendo especificación fiel.
- **Orden**: schema (1-2) antes de `db:generate` (3) antes de tocar mappers/UI (4-6), para que los tipos `$inferSelect/$inferInsert` ya reflejen las columnas.
