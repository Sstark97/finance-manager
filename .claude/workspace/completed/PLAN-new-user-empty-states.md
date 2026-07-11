# Plan: UI y repositorios para "usuario nuevo sin datos"

## Goal

Preparar la app para el caso "usuario recién registrado, sin datos", de cara a la futura
entidad `Usuario` en la que cartera, presupuesto, metas y deudas dejarán de venir de datos
sembrados globalmente y pasarán a estar asociadas a un usuario concreto (que arranca vacío).

El objetivo de ESTA tarea es acotado (YAGNI): que la UI y los repositorios se comporten
correctamente cuando no hay datos, decidiendo entidad por entidad entre (a) estado vacío bien
resuelto o (b) formulario de alta inicial, y sentar las bases para la futura entidad `Usuario`
**sin implementarla ahora** y sin arrancar el seeding actual (que sigue siendo el mecanismo
que garantiza datos en el estado actual).

Además incluye 3 fixes obligatorios detectados en investigación previa (crash de `BudgetTab`
con `months` vacío, repositorios singleton que lanzan excepción dura, y ausencia de
`error.tsx`).

## Affected layers

[x] domain  [x] application  [x] infrastructure  [x] UI

- **Domain**: sin entidades ni value objects nuevos. Solo un pequeño helper para generar el
  "mes de referencia" actual reutilizando `createMonth`. No se introduce ningún tipo `Option`;
  el "no configurado" se modela con `null` (KISS/YAGNI).
- **Application**: se hacen anulables los contratos de los puertos singleton (`BudgetRepository.findBase`,
  `GoalsSettingsRepository.find`), se propaga `null` por `LoadBudget`/`BudgetSnapshot`,
  `LoadGoalsSettings` e `InitialAppState.goalsSettings`, y se ajusta `LoadInitialAppState`
  (detección de seed). **No** se coalesce silenciosamente `null → defaults` para Metas: tanto
  Presupuesto como Metas propagan `null` para disparar un alta explícita en la UI.
- **Infrastructure**: `TursoBudgetRepository.findBase` y `TursoGoalsSettingsRepository.find`
  devuelven `null` en vez de lanzar. **No hay cambio de esquema ni migración** (las filas
  simplemente no existen para un usuario nuevo).
- **UI**: `BudgetTab` seguro con `months` vacío + alta inicial de presupuesto; pulido de estado
  vacío en `WealthTab`; mensaje/alta de deuda en `GoalsTab`; nuevo `error.tsx`.

## Decisión por entidad (con justificación)

### Cartera / Wealth — (a) estado vacío
`PortfolioCalculator.derive([])` ya devuelve ceros de forma segura y `WealthTab` protege todas
las divisiones (`total ? x/total : 0`), filtra el donut por `value > 0`, tolera `history` vacío
y las alertas siempre incluyen un mensaje por defecto. La cartera ya tiene una vía de alta
propia ("Editar cartera" → añadir posición). Por tanto **no** hace falta formulario de alta:
basta pulir el vacío (donut/leyenda vacíos, invitación a "Añadir tu primera posición",
histórico sin serie). Un formulario de alta sería sobre-construir.

### Presupuesto / Budget — (b) formulario de alta inicial
Es el único caso donde el estado vacío no solo es feo sino **no funcional**: sin `budget_base`
y sin al menos un mes de referencia no hay nada que seleccionar ni desviación que calcular, y
además hoy provoca el crash del fix #1. Se necesita capturar los datos mínimos (el presupuesto
base: ingreso neto + reparto por categorías) y crear el **mes de referencia = mes de registro**
(el mes actual, derivado automáticamente; no se le pide al usuario). Diseño YAGNI: **reutilizar
el editor de base ya existente** como superficie de alta (no un wizard nuevo) y generar el mes
actual en el primer guardado.

### Metas / Goals — (b) alta inicial explícita (simétrico con Presupuesto)
Aunque `GoalsSettings` son parámetros de proyección con defaults razonables, **no** debemos
coalescer silenciosamente `null → GOALS_SETTINGS_INITIAL` en Application como si estuvieran
guardados: de cara a la futura entidad `Usuario`, TODOS los datos hardcoded/sembrados
desaparecerán y no existirá un fallback global compartido. Hornear ahora "usar defaults
hardcoded" como comportamiento permanente contradice ese futuro. Cada usuario debe **crear
explícitamente** su configuración de Metas, igual que Presupuesto necesita un alta explícita.

Por tanto Metas se reclasifica a **(b) alta inicial**, con el mismo patrón que Presupuesto y
respetando YAGNI: como la pestaña **ya es un formulario** con todos los inputs editables, la
superficie de alta es ese mismo formulario (no hace falta un wizard nuevo), pero usado como
estado de "alta explícita":
- `GoalsSettingsRepository.find()` devuelve `null` → la UI distingue "aún no configurado" de
  "configurado" y comunica visualmente que no hay datos guardados (igual que Presupuesto).
- `GOALS_SETTINGS_INITIAL` puede reutilizarse **solo como placeholder/sugerencia** en los inputs,
  no como valor ya persistido.
- Requiere un guardado explícito del usuario ("Crear mi configuración de metas" o similar) para
  persistir la fila por primera vez.

Diferencia con Presupuesto: Metas **no** necesita generar ningún mes de referencia (sus
parámetros de proyección no dependen de un mes); el alta es solo "guardar la fila por primera vez".

### Deudas / Debts — (a) estado vacío
Las deudas viven dentro de la pestaña Metas (tarjeta "Deudas y patrimonio neto") y se referencian
en Wealth/Goals por `id` sembrado (`applewatch`, `coche`). Con lista vacía todos los `find` ya
devuelven `undefined` de forma guardada, así que no hay crash. El problema real es que **hoy no
existe UI para crear una deuda** (solo editar/liquidar las sembradas): un usuario nuevo vería una
tarjeta vacía sin salida. Solución mínima: mensaje de vacío ("Aún no has añadido deudas") + un
botón "Añadir deuda" que cree una `Debt` en blanco editable. Sin formulario de alta dedicado.

## Files to create/modify

### Fix #1 — BudgetTab seguro con `months` vacío + alta de presupuesto (UI)
- `src/features/budget/components/BudgetTab.tsx` — **modificar**: dividir el componente para
  respetar las Rules of Hooks. `BudgetTab` decide entre alta/contenido; extraer todo el bloque
  dependiente de un mes (estados `monthId`/`draft`/`syncedMonthId` y las tarjetas de desglose,
  barras y evolución) a un nuevo componente hijo que solo se monta cuando hay al menos un mes.
- `src/features/budget/components/BudgetMonthlyBreakdown.tsx` — **crear** (nombre orientativo):
  recibe `months` no vacío garantizado; contiene la lógica del mes seleccionado que hoy
  peta en la línea ~89.
- `src/features/budget/components/BudgetOnboarding.tsx` — **crear** (nombre orientativo):
  estado de alta cuando `baseBudget == null` (base sin configurar). Reutiliza los inputs del
  editor de base; al guardar, persiste base + genera el mes de referencia actual.

### Fix #2 — repositorios singleton devuelven `null` en vez de lanzar (application + infra)
- `src/features/budget/application/BudgetRepository.ts` — `findBase(): Promise<Budget | null>`.
- `src/features/budget/infrastructure/TursoBudgetRepository.ts` — `findBase` devuelve `null` si
  no hay fila (eliminar el `throw new Error("...singleton row is missing...")`).
- `src/features/goals/application/GoalsSettingsRepository.ts` — `find(): Promise<GoalsSettings | null>`.
- `src/features/goals/infrastructure/TursoGoalsSettingsRepository.ts` — `find` devuelve `null`
  si no hay fila (eliminar el `throw`).
- `src/features/budget/application/BudgetSnapshot.ts` — `baseBudget: Budget | null`.
- `src/features/budget/application/LoadBudget.ts` — propaga `baseBudget` posiblemente `null`.
- `src/features/goals/application/LoadGoalsSettings.ts` — `invoke(): Promise<GoalsSettings | null>`.
- `src/app/LoadInitialAppState.ts` — **crítico**: (1) `checkHasBeenSeeded` ya no puede depender
  del `throw`; pasa a comprobar `!== null`. (2) `InitialAppState.goalsSettings: GoalsSettings | null`
  y `budget.baseBudget: Budget | null`: **ni goals ni budget se coalescen** a defaults; ambos se
  propagan `null` para disparar el alta explícita en la UI. (`seedGoalsSettings` sigue existiendo
  solo como semilla del seeding actual, NO como fallback de lectura para el usuario nuevo).
- `src/features/goals/infrastructure/TursoGoalsSettingsRepository.integration.test.ts`,
  `src/features/budget/infrastructure/TursoBudgetRepository.integration.test.ts` — actualizar
  las expectativas: "sin fila → devuelve `null`" en lugar de "lanza".

### Fix #3 — error boundary de Next (UI)
- `src/app/error.tsx` — **crear**: Client Component (`"use client"`) con `error`/`reset`,
  estilado con `palette`, mensaje amable y botón "Reintentar" (`reset()`).
- `src/app/global-error.tsx` — **opcional**, solo si se quiere cubrir también errores del
  `RootLayout`; incluye sus propios `<html><body>`. Se puede dejar fuera por YAGNI y añadir el
  básico `error.tsx` (que es lo que pide la tarea).

### Estados vacíos / alta por entidad (UI)
- `src/features/wealth/components/WealthTab.tsx` — invitación "Añade tu primera posición" cuando
  `portfolio.length === 0`; donut/leyenda con placeholder vacío. **(a)**
- `src/features/goals/components/GoalsTab.tsx` — **(b) alta explícita**: distinguir "aún no
  configurado" (settings `null`) de "configurado". En modo alta, prellenar los inputs con
  `GOALS_SETTINGS_INITIAL` como placeholder/sugerencia (no como valor guardado), comunicar
  visualmente que no hay datos guardados y exigir un guardado explícito ("Crear mi configuración
  de metas") para persistir la fila por primera vez. Deudas dentro de esta pestaña: mensaje "Aún
  no has añadido deudas" + botón "Añadir deuda" (crea una `Debt` en blanco con `generateId()`) **(a)**.
- `src/features/budget/domain/month.ts` — añadir helper `createCurrentMonth()` (reutiliza
  `createMonth(year, monthIndex)` con la fecha actual) para el mes de referencia del alta.

### Propagación de tipos anulables en el shell (UI)
- `src/app/FinanceAppShell.tsx` — `initialBaseBudget: Budget | null` y estado `baseBudget`
  anulable (ruta a alta de Presupuesto cuando es `null`); e `initialGoalsSettings: GoalsSettings | null`
  (o props de goals anulables) con estado anulable y ruta a alta de Metas cuando es `null`.
  Ojo con los `useEffect` de persistencia con debounce: no deben persistir goals mientras estén
  en estado "no configurado" (`null`), solo tras el alta explícita.
- `src/app/page.tsx` — pasar `baseBudget` y `goalsSettings` posiblemente `null` (sin coalescer);
  hoy, con el seeding activo, llegan poblados, pero el tipo debe admitir `null` para la ruta de
  usuario nuevo real.

## Implementation steps

1. **Fix #2 (repos → null)**: cambiar firmas de puertos y adaptadores Turso para `budget_base`
   y `goals_settings` (devolver `null`, quitar `throw`). Actualizar mappers no hace falta (solo
   se invocan cuando hay fila).
2. **Application null-safe**: `BudgetSnapshot.baseBudget: Budget | null`, `LoadBudget` y
   `LoadGoalsSettings` propagan `null`.
3. **`LoadInitialAppState`**: reescribir `checkHasBeenSeeded` para comprobar `null` (no `try/catch`
   sobre el `throw`); **NO** coalescer goals ni budget a defaults — propagar ambos `null` tal cual
   (`InitialAppState.goalsSettings: GoalsSettings | null`, `budget.baseBudget: Budget | null`).
   Verificar que el seeding actual sigue funcionando exactamente igual (sigue poblando
   `goals_settings` y `budget_base` con los valores sembrados de hoy); lo único que cambia es que
   la RUTA de un usuario nuevo real (sin seed) ya no recibe esos valores como si estuvieran guardados.
4. **`month.ts`**: añadir `createCurrentMonth()`.
5. **Fix #1 (BudgetTab)**: extraer el bloque dependiente de mes a `BudgetMonthlyBreakdown`
   (con `months` no vacío garantizado) y crear `BudgetOnboarding`. `BudgetTab` decide:
   `baseBudget == null` → alta; `baseBudget` presente pero `months` vacío → auto-crear el mes
   actual (o mostrar CTA "Registrar mes actual"); si hay meses → breakdown normal. La tarjeta de
   base anual se mantiene visible/siempre editable.
6. **Alta explícita de Metas (b)**: en `GoalsTab`, distinguir settings `null` (no configurado) de
   configurado; renderizar el formulario en modo alta con `GOALS_SETTINGS_INITIAL` solo como
   placeholder, señal visual de "sin guardar", y CTA "Crear mi configuración de metas" que persiste
   la fila por primera vez. Asegurar que la persistencia con debounce del shell no dispare guardados
   mientras el estado es `null`.
7. **Estados vacíos (a)**: pulir `WealthTab` (portfolio vacío) y las deudas en `GoalsTab`
   (lista vacía + botón añadir deuda).
8. **Shell/page**: propagar `Budget | null` y `GoalsSettings | null`; rutas condicionales a alta.
9. **Fix #3**: crear `src/app/error.tsx`.
10. **Tests**: actualizar integration tests de ambos repositorios (null en vez de throw); añadir
    unit test de `LoadInitialAppState` para "sin datos → no seedeado", "goals null → se propaga null
    (no defaults)" y "baseBudget null → se propaga null"; tests de componente de `BudgetTab` con
    `months=[]` (no crashea, muestra alta) y de `GoalsTab` con settings `null` (muestra alta explícita,
    no persiste hasta el guardado).

## Testing strategy

- **Unit**:
  - `LoadInitialAppState.unit.test.ts`: (a) repos devuelven `null` → `checkHasBeenSeeded` es
    `false` → se ejecuta el seed; (b) con datos → no seedea; (c) `goalsSettings` null se
    **propaga como null** (NO se coalesce a `seedGoalsSettings`); (d) `baseBudget` null se propaga
    sin coalescer.
  - `LoadBudget` / `LoadGoalsSettings`: propagan `null` correctamente.
  - `month.ts`: `createCurrentMonth()` genera fecha/label del mes actual y `isMonthAvailable` true.
- **Component (Vitest + RTL)**:
  - `BudgetTab` con `months=[]` y `baseBudget=null`: renderiza el alta, no lanza (regresión del
    fix #1). Con `baseBudget` presente y `months=[]`: no lee `month.netIncomeOverride` sin guard.
  - `GoalsTab` con settings `null`: muestra el alta explícita (placeholder + señal "sin guardar"),
    y NO persiste hasta pulsar "Crear mi configuración de metas". Con settings presentes: modo normal.
  - `WealthTab` con `portfolio=[]`: muestra invitación, no rompe.
  - `GoalsTab` con `debts=[]`: muestra mensaje y botón "Añadir deuda".
- **Integration (Turso, libSQL real)**:
  - `TursoBudgetRepository.integration.test.ts`: sin fila `budget_base` → `findBase()` devuelve
    `null` (antes esperaba throw).
  - `TursoGoalsSettingsRepository.integration.test.ts`: sin fila → `find()` devuelve `null`.

## Architecture decisions

- **`null` en vez de `Option`/tipo resultado** para "aún no configurado": es la solución más
  simple que respeta el hexágono (el dominio no gana un VO nuevo) y encaja con la futura entidad
  `Usuario` (un usuario nuevo = filas ausentes). Introducir un tipo `Option` sería sobre-diseño
  (YAGNI). Regla: el `throw` para "fila singleton ausente" era un caso de negocio ("no
  configurado") tratado como error de infraestructura; se corrige devolviendo un valor que la
  capa superior puede modelar.
- **Sin coalescencia silenciosa a defaults hardcoded**: ni Goals ni Budget se rellenan
  automáticamente con `GOALS_SETTINGS_INITIAL`/`BUDGET_BASE_INITIAL` como si estuvieran guardados.
  Ambos propagan `null` ("no configurado") y la UI dispara un alta explícita. Motivo: con la futura
  entidad `Usuario` desaparecen los datos hardcoded/sembrados y no habrá fallback global; hornear
  ahora "usar defaults" como comportamiento permanente contradiría ese futuro. Los defaults solo
  sobreviven como **placeholder/sugerencia** en los inputs del alta, nunca como valor persistido
  implícitamente. Presupuesto y Metas quedan **simétricos**: ambos son "(b) alta inicial
  reutilizando el editor existente"; Presupuesto además genera el mes de referencia, Metas no
  necesita nada adicional.
- **Reutilizar el editor existente como alta** (no wizard nuevo) en ambas features y **derivar el
  mes de referencia** del mes actual en Presupuesto (no pedírselo al usuario): mínima superficie
  nueva, funcional desde el primer guardado explícito.
- **El seeding sigue poblando `goals_settings` y `budget_base`** con los valores sembrados de hoy
  (no se elimina en esta tarea). El cambio es solo de la ruta de lectura de un usuario nuevo real
  (sin seed), que ya no recibe esos valores como si estuvieran guardados.
- **Split de `BudgetTab` por Rules of Hooks**: el guard de vacío debe ser un early-return ANTES
  de los hooks dependientes del mes; por eso se extrae el cuerpo dependiente de mes a un hijo,
  en lugar de intentar condicionar hooks (que sería incorrecto y frágil). Cada pieza es una
  función de componente con responsabilidad única (SRP).
- **Sin cambio de esquema ni migración**: el estado "vacío" es la ausencia de filas; el esquema
  ya lo permite. No se toca `schema.ts`.
- **No se toca el seeding todavía**: sigue siendo el mecanismo que garantiza datos en el estado
  actual. Solo se ajusta su detección (que dependía del `throw`). Arrancarlo/eliminarlo es
  trabajo de la futura entidad `Usuario`, no de esta tarea.
- **Estructura hexagonal ya existente**: cada feature ya tiene `domain/application/infrastructure/components`;
  no hay que introducir carpetas nuevas. Los ficheros nuevos caen en su slice correspondiente.

## Risks and dependencies

- **Interacción crítica seed ↔ null (fix #2)**: `checkHasBeenSeeded` HOY se apoya en que
  `find()` lanza. Al devolver `null`, si no se actualiza, `checkHasBeenSeeded` devolvería `true`
  siempre y el seed dejaría de ejecutarse. **Orden obligatorio**: cambiar el repo y
  `LoadInitialAppState` en el mismo paso, con test que lo cubra.
- **`page.tsx`/`FinanceAppShell` acceden a `goalsSettings.currentSalary`, `fiContribution`, etc.**:
  al dejar de coalescer, `goalsSettings` puede ser `null`. Hay que hacer anulables los props que
  bajan al shell y enrutar a alta de Metas cuando es `null` (no leer campos de un `null`). Con el
  seeding activo hoy llegan poblados, pero el tipo debe admitir `null` para la ruta de usuario nuevo.
- **Persistencia con debounce del shell en estado "no configurado"**: los `useEffect` de
  `saveGoalsSettings`/`saveBudget` no deben persistir mientras el estado es `null` (evitar escribir
  una fila vacía antes del alta explícita). El guardado real ocurre solo tras el CTA de alta.
- **Acoplamiento por `id` sembrado** (`applewatch`, `coche`, `kindle`, `ledger`): las alertas de
  Wealth y la lógica "contar coche como activo" dependen de ids concretos que un usuario nuevo no
  tendrá. No rompe (los `find` están guardados) pero queda como **deuda funcional** a resolver con
  la entidad `Usuario` (fuera de alcance). Documentado, no se aborda ahora.
- **`error.tsx` debe ser Client Component**; captura errores de render de las rutas hijas pero no
  del `RootLayout` (para eso haría falta `global-error.tsx`, opcional).
- **Orden de implementación recomendado**: fix #2 + `LoadInitialAppState` (con tests) →
  tipos anulables en application → `month.ts` helper → split y alta de `BudgetTab` (fix #1) →
  estados vacíos Wealth/Goals → propagación en shell/page → `error.tsx` (fix #3).
