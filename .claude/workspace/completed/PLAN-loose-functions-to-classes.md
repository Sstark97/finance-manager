# Plan: Eliminar funciones sueltas exportadas → clases (class-first)

## Goal
Erradicar las funciones exportadas con lógica real ("helpers" sueltos) que violan la convención
`class-first-architecture` del repo, convirtiéndolas en **clases con métodos de intención clara**.
Bajo la interpretación estricta acordada con el usuario, cualquier `export const foo = (...) =>` o
`export function foo(...)` con lógica real es un smell aunque el skill toleraría un "tiny pure local
helper" *privado a un fichero* — aquí están exportadas como API de feature, así que la excepción no
aplica.

Es un **refactor puro de forma**: no cambia comportamiento observable, solo la envoltura. Cubre las
4 violaciones auditadas:

1. `src/features/budget/domain/month.ts` — `createMonth`, `createCurrentMonth`, `monthKey`, `isMonthAvailable`.
2. `src/lib/format.ts` — `formatEuro`, `formatEuroWithCents`, `formatPercent`, `generateId`.
3. `src/lib/di/container.ts` — 10 factories `getXxx()` (composition root).
4. `src/infrastructure/db/client.ts` — `toDatabase(client)` suelta junto a `TursoClientFactory`.

Fuera de alcance (decidido con el usuario): `src/lib/theme.ts` (`seriesColorAt`) se mantiene.

## Affected layers
[x] domain — `month.ts` se parte en `MonthFactory` + `MonthAvailability` (dominio puro).
[x] application — sin cambios de lógica; el composition root que las cablea sí cambia de forma.
[x] infrastructure — `client.ts` (`toDatabase` → método estático), composition root `ContainerDI`.
[x] UI — componentes de las 3 features actualizan imports de formato/mes; Server Actions y Route Handlers actualizan el import del container (siguen siendo funciones exportadas, legítimas).

## Nota previa
- **No existe `CLAUDE.md`** en la raíz del repo (la tarea pide leerlo; solo hay skills en
  `.claude/skills/`). No es bloqueante para este plan.
- **Precedente de estilo ya consolidado en el repo**: los servicios de dominio sin estado se
  modelan como *clase + instancia singleton exportada en camelCase*:
  `export const portfolioCalculator = new PortfolioCalculator()`
  (idéntico en `MonthlyBudgetCalculator`, `FinancialProjectionCalculator`). Los consumidores
  importan esa instancia. **Este plan reutiliza ese patrón** para máxima coherencia; no inventa
  uno nuevo (ni métodos estáticos, que romperían la convención).
- **Este plan supersede explícitamente la decisión 2 de `PLAN-split-finanzas-components.md`**, que
  dejó `formatEuro`/etc. y `createMonth`/etc. como funciones sueltas invocando la excepción "tiny
  pure helpers". Bajo la regla estricta actual, esa excepción no aplica porque son API exportada.
- No hay barrels/re-exports de estos módulos: cada import es directo (verificado por grep), así que
  el renombrado es mecánico y `tsc` caza cualquier referencia perdida.

## Files to create/modify

### 1. Formato e IDs (`src/lib/format.ts` → dos clases)
Crear:
- `src/lib/CurrencyFormatter.ts` — clase `CurrencyFormatter` con `euro(amount)`, `euroWithCents(amount)`,
  `percent(value)`; el actual `safe(value)` pasa a método privado. Exporta singleton
  `export const currencyFormatter = new CurrencyFormatter()`.
- `src/lib/IdGenerator.ts` — clase `IdGenerator` con `generate(): string`. Exporta singleton
  `export const idGenerator = new IdGenerator()`.

Eliminar:
- `src/lib/format.ts`.

Modificar (call-sites de formato/ID):
- `src/features/wealth/components/WealthTab.tsx` — `formatEuro`→`currencyFormatter.euro`, `formatEuroWithCents`→`currencyFormatter.euroWithCents`, `formatPercent`→`currencyFormatter.percent`, `generateId()`→`idGenerator.generate()`.
- `src/features/goals/components/GoalsTab.tsx` — ídem.
- `src/features/budget/components/BudgetWorkspace.tsx` — `formatEuroWithCents`, `formatPercent`, `generateId`.
- `src/features/budget/components/BudgetOnboarding.tsx` — `formatEuroWithCents`, `generateId`.
- `src/features/budget/components/BudgetMonthlyBreakdown.tsx` — `formatEuro`, `formatEuroWithCents`, `generateId`.
- `src/features/budget/data/budget.ts` — `generateId()`→`idGenerator.generate()` (y `createMonth`, ver punto 2).

### 2. Mes (`src/features/budget/domain/month.ts` → dos clases de dominio)
Crear:
- `src/features/budget/domain/MonthFactory.ts` — clase `MonthFactory` con
  `create(year, monthIndex, overrides?, events?): Month` y `createCurrent(): Month`
  (delega en `create`). Depende de `IdGenerator` por **inyección en constructor**
  (`constructor(private readonly idGenerator: IdGenerator)`). Exporta singleton
  `export const monthFactory = new MonthFactory(idGenerator)`.
- `src/features/budget/domain/MonthAvailability.ts` — clase `MonthAvailability` con
  `keyOf(date): number` y `isAvailable(date): boolean`. Exporta singleton
  `export const monthAvailability = new MonthAvailability()`.

Eliminar:
- `src/features/budget/domain/month.ts`.

Modificar (call-sites de mes):
- `src/features/budget/components/BudgetWorkspace.tsx` — `createCurrentMonth()`→`monthFactory.createCurrent()`.
- `src/features/budget/components/BudgetTab.tsx` — `createCurrentMonth()`→`monthFactory.createCurrent()`.
- `src/features/budget/components/BudgetMonthlyBreakdown.tsx` — `isMonthAvailable(...)`→`monthAvailability.isAvailable(...)`.
- `src/features/budget/data/budget.ts` — `createMonth(...)`→`monthFactory.create(...)`.

### 3. Composition root (`src/lib/di/container.ts` → clase `ContainerDI`)
Crear (renombrando el fichero para alinearlo con el skill hexagonal, que nombra el composition root
`src/lib/di/ContainerDI.ts`, y con la convención PascalCase-por-clase del repo):
- `src/lib/di/ContainerDI.ts` — clase `ContainerDI` con métodos:
  `refreshPositionPrices()`, `computePortfolioHistory()`, `loadDebts()`, `saveDebts()`,
  `loadPortfolio()`, `savePortfolio()`, `loadBudget()`, `saveBudget()`, `loadGoalsSettings()`,
  `saveGoalsSettings()`. Los singletons eager actuales (`assetPriceGateway`, instancia de
  `RefreshPositionPrices`, `computePortfolioHistory`) pasan a **campos privados** inicializados en el
  constructor; `cachedDatabase` pasa a **campo privado lazy** vía método privado `database()`
  (misma memoización que hoy). Exporta singleton `export const container = new ContainerDI()`.

Eliminar:
- `src/lib/di/container.ts`.

Modificar (call-sites del container — puntos de entrada legítimos, solo cambia el import y la llamada):
- `src/app/page.tsx` — `getLoadPortfolio()`→`container.loadPortfolio()`, etc. (8 getters).
- `src/app/actions/savePortfolio.ts` — `getSavePortfolio()`→`container.savePortfolio()`.
- `src/app/actions/saveBudget.ts` — `getSaveBudget()`→`container.saveBudget()`.
- `src/app/actions/saveDebts.ts` — `getSaveDebts()`→`container.saveDebts()`.
- `src/app/actions/saveGoalsSettings.ts` — `getSaveGoalsSettings()`→`container.saveGoalsSettings()`.
- `src/app/api/prices/route.ts` — `getRefreshPositionPrices()`→`container.refreshPositionPrices()`.
- `src/app/api/prices/history/route.ts` — `getComputePortfolioHistory()`→`container.computePortfolioHistory()`.

### 4. `toDatabase` (`src/infrastructure/db/client.ts` → método estático)
Modificar:
- `src/infrastructure/db/client.ts` — convertir `export function toDatabase(client)` en
  `static toDatabase(client: Client): Database` dentro de `TursoClientFactory`; eliminar la función suelta.
Actualizar call-sites:
- `src/lib/di/ContainerDI.ts` — `toDatabase(new TursoClientFactory().create())`→`TursoClientFactory.toDatabase(new TursoClientFactory().create())` (o guardar la factory en variable).
- `src/infrastructure/db/__fixtures__/TestDatabaseFactory.ts` — `toDatabase(client)`→`TursoClientFactory.toDatabase(client)`.

### Tests a actualizar/partir
- `src/features/budget/domain/month.unit.test.ts` — dividir en tests co-localizados por clase:
  - `src/features/budget/domain/MonthFactory.unit.test.ts` — casos `createMonth`/`createCurrentMonth` → `monthFactory.create`/`monthFactory.createCurrent`.
  - `src/features/budget/domain/MonthAvailability.unit.test.ts` — casos `isMonthAvailable`/`monthKey` → `monthAvailability.isAvailable`/`monthAvailability.keyOf`.
  - Eliminar `month.unit.test.ts`.
- `src/features/budget/components/BudgetTab.unit.test.tsx` — `createMonth(2026, 5)`→`monthFactory.create(2026, 5)`.

## Implementation steps
Orden hoja→raíz. Tras cada paso: `tsc` (o `pnpm typecheck`) + `pnpm test` verdes; verificación
runtime al final (las 3 pestañas + persistencia). Cada paso es mecánico y aislado.

1. Crear `IdGenerator.ts` y `CurrencyFormatter.ts`. Aún no borrar `format.ts` (coexisten un momento).
2. Actualizar los 6 call-sites de formato/ID (WealthTab, GoalsTab, BudgetWorkspace, BudgetOnboarding, BudgetMonthlyBreakdown, data/budget.ts) para importar los singletons. Borrar `format.ts`. `tsc` confirma que no queda ningún import a `@/lib/format`.
3. Crear `MonthAvailability.ts` y `MonthFactory.ts` (este importa `idGenerator` del paso 1).
4. Actualizar call-sites de mes (BudgetWorkspace, BudgetTab, BudgetMonthlyBreakdown, data/budget.ts). Borrar `month.ts`.
5. Partir el test de mes en `MonthFactory.unit.test.ts` + `MonthAvailability.unit.test.ts`; actualizar `BudgetTab.unit.test.tsx`. Ejecutar suite.
6. `client.ts`: mover `toDatabase` a `static` en `TursoClientFactory`; actualizar `TestDatabaseFactory.ts`. Ejecutar tests de integración Turso.
7. Crear `ContainerDI.ts` (clase + singleton `container`), usando `TursoClientFactory.toDatabase(...)`. Borrar `container.ts`.
8. Actualizar los 7 call-sites del container (page.tsx + 4 actions + 2 route handlers).
9. Verificación final: `tsc`, `pnpm test`, `pnpm lint`, y `next dev` — recorrer Patrimonio/Presupuesto/Metas, alta de mes, refresco de precios, histórico, y persistencia (guardar/recargar) para confirmar cero cambios de comportamiento.

## Testing strategy
- **Unit (dominio puro, sin mocks)**: los tests migrados de `MonthFactory`/`MonthAvailability`
  mantienen exactamente los mismos casos (fecha/label, defaults, overrides/events, disponibilidad
  pasado/actual/futuro, monotonía de `keyOf`). Es la mejor red de seguridad de que el refactor no
  cambió comportamiento.
- **Component (RTL)**: `BudgetTab.unit.test.tsx` solo cambia la construcción del `Month` de prueba;
  las aserciones por rol semántico no cambian.
- **Integración Turso**: `TestDatabaseFactory` es consumido por los tests de repositorios
  (`Turso*Repository`); tras cambiar `toDatabase` a estático, esa suite debe seguir verde sin tocar
  su lógica — valida el punto 4.
- **Formato**: no hay test previo de `format.ts` y no se añade uno nuevo (fuera del scope del
  refactor; `toLocaleString` depende del locale del runner). Los tests existentes que renderizan
  importes cubren indirectamente `currencyFormatter`.
- **Container**: sin test unitario (composition root); se valida por `tsc` + el flujo runtime del paso 9.

## Architecture decisions

1. **Clase + singleton exportado (no métodos estáticos, no inyección en cada componente)**. Se
   replica el patrón ya consolidado del repo (`portfolioCalculator`, `monthlyBudgetCalculator`,
   `financialProjectionCalculator`): clase con métodos de intención + `export const xxx = new Xxx()`.
   Trade-off evaluado para `CurrencyFormatter`/`IdGenerator`, de uso transversal en decenas de
   componentes React:
   - *Métodos estáticos* → rechazado: rompería la convención del repo y no permite inyectar/mockear
     si algún día hiciera falta (p. ej. un `IdGenerator` determinista en tests).
   - *`new` en cada componente* → rechazado: choca con "construir solo en el composition root" y añade
     ruido. Para utilidades sin estado, una instancia singleton importada es lo más simple y coherente.
   - *Singleton de módulo* → elegido: cero fricción en el call-site (`currencyFormatter.euro(x)`),
     sin estado compartido problemático (son puras), alineado con lo existente.

2. **`month.ts` partido en dos clases (SRP)**. `MonthFactory` (creación de `Month`) y
   `MonthAvailability` (orden/disponibilidad temporal) son responsabilidades distintas; juntarlas en
   una sola clase sería un cluster de funciones disfrazado. `monthKey` se expone como
   `MonthAvailability.keyOf` porque su único uso real es `isAvailable` y el test lo verifica directamente.

3. **Dominio depende de `IdGenerator` por inyección, sin romper hexagonal**. `MonthFactory` vive en
   `domain/` y necesita generar IDs. Se inyecta `IdGenerator` en el constructor (no se instancia
   dentro). La regla "dominio sin dependencias de framework" se respeta: `IdGenerator` es utilidad
   pura (`Math.random`), cero deps de Next/React/Turso/ORM — de hecho `month.ts` ya importaba
   `generateId` de `@/lib`, así que **no se introduce acoplamiento nuevo**, solo se formaliza en
   clase. (Alternativa considerada: mover `IdGenerator` a `domain/shared`; descartada por YAGNI —
   también se usa desde UI y `lib` es la capa util neutra correcta.)

4. **`ContainerDI` como clase con singleton (composition root)**. El skill hexagonal nombra el
   composition root `src/lib/di/ContainerDI.ts` y muestra un objeto `container`; no hay razón real
   para factories sueltas (todas comparten el mismo estado de módulo; el tree-shaking por-getter no
   aporta nada aquí). Se renombra el fichero `container.ts`→`ContainerDI.ts` para alinearlo con el
   skill y con la convención PascalCase-por-clase (`PortfolioCalculator.ts`, `TursoClientFactory`,
   etc.). Los puntos de entrada de Next (Server Actions en `src/app/actions/*` y Route Handlers en
   `src/app/api/**/route.ts`) **siguen siendo funciones exportadas** (Next lo exige) y siguen
   delegando en una línea; solo cambia `getXxx()` por `container.xxx()`. **Comportamiento idéntico**:
   los campos eager se construían ya a nivel de módulo; `database()` conserva la misma memoización lazy.

5. **`toDatabase` estático, no de instancia**. Es una conversión pura `Client → Database` sin estado
   ni relación con `create()`; hacerla `static` evita forzar una instancia de `TursoClientFactory`
   solo para convertir (relevante en `TestDatabaseFactory`, que fabrica su propio `Client` temporal).

6. **`theme.ts` intacto** (decidido con el usuario): `seriesColorAt` es un lookup trivial; convertirlo
   sería sobre-ingeniería.

## Risks and dependencies
- **Red de seguridad**: `tsc` + Vitest + `next dev`. Todo import a un símbolo eliminado rompe la
  compilación, así que el renombrado es de bajo riesgo si se ejecuta `tsc` tras cada paso.
- **Orden estricto de dependencias**: `IdGenerator` antes que `MonthFactory` (lo inyecta);
  `CurrencyFormatter`/`IdGenerator` antes de borrar `format.ts`; `toDatabase` estático antes de
  `ContainerDI` (lo usa); `ContainerDI` antes de actualizar sus call-sites.
- **`data/budget.ts`** toca las dos migraciones a la vez (`generateId` y `createMonth`): actualizar
  ambos imports en el mismo paso para no dejar el fichero a medias.
- **React Compiler activado**: no tocar `useMemo`/`useCallback` existentes; es un refactor de forma,
  no de rendimiento.
- **No cambiar firmas ni comportamiento**: `create(year, monthIndex, overrides?, events?)` mantiene
  los mismos parámetros y defaults que `createMonth`; `euro`/`euroWithCents`/`percent` mantienen las
  mismas opciones de `toLocaleString`/`toFixed`; `container.xxx()` devuelve las mismas instancias/
  casos de uso que los `getXxx()`. Cualquier "mejora" de comportamiento queda fuera de scope.
- **Rename de fichero del container**: asegurarse de que ningún import residual apunte a
  `@/lib/di/container` tras el paso 8 (grep final + `tsc`).
