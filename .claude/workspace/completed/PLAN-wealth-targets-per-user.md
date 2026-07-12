# Plan: Objetivos de patrimonio editables y persistidos por usuario (`WealthTargets`)

## Goal

Eliminar el hardcode `TARGETS` de `src/features/wealth/domain/config.ts` y convertirlo en
**configuración editable y persistida por usuario** (`user_id` como PK), replicando exactamente el
patrón ya establecido por `goals_settings` en la feature de autenticación multiusuario.

`TARGETS` contiene objetivos de planificación financiera **personales** (fondo de emergencia
objetivo/mínimo, distribución objetivo de renta variable World/EM/Nasdaq, y umbrales de peso de
Bitcoin para pausar/vender). Hoy son iguales para todos los usuarios porque la app nació
mono-usuario; ahora cada usuario debe tener los suyos.

**Fuera de alcance explícito:** `COMPOSITIONS` (mismo archivo) es información de mercado
orientativa, NO personal — se queda hardcodeada tal cual en `config.ts`.

## Affected layers

[x] domain — nuevo tipo `WealthTargets` + `EquityTargets`
[x] application — puerto `WealthTargetsRepository`, use cases `Load`/`Save`, `LoadInitialAppState`
[x] infrastructure — nueva tabla Turso, repositorio, mapper, migración Drizzle, Server Action
[x] UI — `WealthTab`, `GoalsTab`, nuevo `WealthTargetsOnboarding`, `FinanceAppShell`, `page.tsx`

## Decisión de nombres (code-semantic)

- Tipo agregado: **`WealthTargets`** (paralelo a `GoalsSettings`; reusa el nombre semántico del
  antiguo `TARGETS` de la feature wealth).
- Tipo anidado para la distribución RV: **`EquityTargets`** (`{ world, em, nasdaq }`), paralelo a
  cómo `BtcConditions` es un tipo anidado dentro de `GoalsSettings`.
- Renombrados semánticos respecto al objeto `TARGETS` original (los nombres actuales son ambiguos —
  "pause/sell" de qué):
  - `btcPause` → `btcPauseWeight`  (umbral de **peso %** de BTC en cartera para pausar aportaciones)
  - `btcSell` → `btcSellWeight`   (umbral de **peso %** de BTC para venta parcial)
  - `btcPauseThreshold` → `btcPauseCapital`  (umbral de **capital €** de cartera)
  - `btcSellThreshold` → `btcSellCapital`
  - `emergencyFund`, `minimumFund`, `equityTargets` se mantienen (ya son semánticos).

Forma del dominio (anidado, como `GoalsSettings.btcConditions`; se aplana solo en el row mapper):

```ts
export interface EquityTargets { world: number; em: number; nasdaq: number; }

export interface WealthTargets {
  emergencyFund: number;
  minimumFund: number;
  equityTargets: EquityTargets;
  btcPauseWeight: number;
  btcSellWeight: number;
  btcPauseCapital: number;
  btcSellCapital: number;
}
```

## Files to create/modify

### Domain
- `src/features/wealth/domain/WealthTargets.ts` — **crear**. Interfaces `WealthTargets` y
  `EquityTargets`. (Decisión de ubicación: ver Architecture decisions — el equivalente `GoalsSettings`
  vive en `application/`, pero aquí lo colocamos en `domain/` porque el task lo pide explícitamente,
  porque `TARGETS`/la distribución RV ya vivían en `wealth/domain/config.ts`, y porque un tipo de
  datos puro de dominio es hexagonalmente válido — la app depende hacia dentro.)
- `src/features/wealth/domain/config.ts` — **modificar**. Eliminar el `export const TARGETS`.
  Conservar `COMPOSITIONS` intacto y su import de `Composition`.

### Data (defaults / onboarding)
- `src/features/wealth/data/wealthTargets.ts` — **crear** (nueva carpeta `data/`, paralelo a
  `src/features/goals/data/goalsSettings.ts`). Exporta
  `WEALTH_TARGETS_INITIAL: WealthTargets` con los valores actuales como sugerencia por defecto:
  `emergencyFund: 4900, minimumFund: 1000, equityTargets: { world: 60, em: 20, nasdaq: 20 },
  btcPauseWeight: 40, btcSellWeight: 50, btcPauseCapital: 10000, btcSellCapital: 20000`.

### Application (puerto + use cases)
- `src/features/wealth/application/WealthTargetsRepository.ts` — **crear**. Puerto driven:
  `find(userId): Promise<WealthTargets | null>` y `save(userId, targets): Promise<void>`.
- `src/features/wealth/application/LoadWealthTargets.ts` — **crear**. Interface
  `LoadWealthTargetsUseCase` + clase `LoadWealthTargets` con `invoke(userId)`.
- `src/features/wealth/application/SaveWealthTargets.ts` — **crear**. Interface
  `SaveWealthTargetsUseCase` + clase `SaveWealthTargets` con `invoke(userId, targets)`.

### Infrastructure (Turso + mapper + migración)
- `src/infrastructure/db/schema.ts` — **modificar**. Añadir tabla `wealthTargets`
  (`wealth_targets`), `user_id` como PK con `references(() => users.id, { onDelete: "cascade" })`,
  columnas `real` (ver esquema abajo). Sin índice extra (PK = user_id, igual que `goals_settings`).
- `src/features/wealth/infrastructure/WealthTargetsRowMapper.ts` — **crear**. Clase con
  `toDomain(row)` y `toRow(targets, userId)`. Aplana `equityTargets` en columnas
  `equity_target_world/em/nasdaq` y las reanida en `toDomain` (paralelo a cómo el mapper de goals
  trata `btcConditions`).
- `src/features/wealth/infrastructure/TursoWealthTargetsRepository.ts` — **crear**. Copia exacta del
  patrón `TursoGoalsSettingsRepository`: `select().where(eq(userId))` + `insert().onConflictDoUpdate`.
- `drizzle/0001_<generado>.sql` + `drizzle/meta/*` — **generar** con `pnpm db:generate` (drizzle-kit).
  NO escribir SQL a mano; la migración se genera desde el schema. El dev DB local se migra solo en
  `predev` (`scripts/setup-local-dev-db.mjs`) y los tests vía `TestDatabaseFactory` (ambos leen la
  carpeta `drizzle/`).

Esquema propuesto de la tabla:

```
wealth_targets (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  emergency_fund REAL NOT NULL,
  minimum_fund REAL NOT NULL,
  equity_target_world REAL NOT NULL,
  equity_target_em REAL NOT NULL,
  equity_target_nasdaq REAL NOT NULL,
  btc_pause_weight REAL NOT NULL,
  btc_sell_weight REAL NOT NULL,
  btc_pause_capital REAL NOT NULL,
  btc_sell_capital REAL NOT NULL
)
```

### Composition root + Server Action
- `src/lib/di/ContainerDI.ts` — **modificar**. Añadir `loadWealthTargets(): LoadWealthTargetsUseCase`
  y `saveWealthTargets(): SaveWealthTargetsUseCase`, construyendo
  `new TursoWealthTargetsRepository(this.database())` (mismo estilo que `loadGoalsSettings`/
  `saveGoalsSettings`).
- `src/app/actions/saveWealthTargets.ts` — **crear**. `"use server"`; resuelve `userId` SIEMPRE en
  servidor vía `currentUserProvider.requireUserId()` (nunca aceptado del cliente — patrón anti-IDOR),
  llama `container.saveWealthTargets().invoke(userId, targets)`. Copia literal de
  `saveGoalsSettings.ts`.

### App wiring (carga inicial + estado + persistencia)
- `src/app/LoadInitialAppState.ts` — **modificar**. Añadir `loadWealthTargets: LoadWealthTargetsUseCase`
  a `LoadInitialAppStateDependencies`, `wealthTargets: WealthTargets | null` a `InitialAppState`, y
  añadirlo al `Promise.all`.
- `src/app/page.tsx` — **modificar**. Pasar `loadWealthTargets: container.loadWealthTargets()` a
  `LoadInitialAppState` y `initialWealthTargets={initialState.wealthTargets}` a `FinanceAppShell`.
- `src/app/FinanceAppShell.tsx` — **modificar**. Nuevo prop `initialWealthTargets`, nuevo estado
  `wealthTargets`/`setWealthTargets`, y un `useEffect` de persistencia con debounce +
  flush-on-unmount **idéntico** al de `goalsSettings` (guardas `isFirstRun`, `pendingFlush`, salta si
  `null`, llama `saveWealthTargets`). Pasar `wealthTargets`/`setWealthTargets` a `WealthTab` y
  `wealthTargets` (read-only) a `GoalsTab`.

### UI de edición / onboarding
- `src/features/wealth/components/WealthTargetsOnboarding.tsx` — **crear**. Espejo de
  `GoalsSettingsOnboarding.tsx`: formulario con estado local, `onCreateTargets(targets)`,
  placeholders desde `WEALTH_TARGETS_INITIAL`, botón "Crear mis objetivos". No persiste hasta
  confirmar.
- `src/features/wealth/components/WealthTab.tsx` — **modificar**:
  - Nuevos props `wealthTargets: WealthTargets | null`, `setWealthTargets: Dispatch<...>`.
  - Sustituir todos los usos de `TARGETS.*` por `wealthTargets.*` (líneas 74–95, 403–412).
  - Rutear también los `60/20/20` **hardcodeados** de la `score` (línea 92) y de `equityRows`
    (línea 179) por `wealthTargets.equityTargets` (DRY — hoy están duplicados respecto a `TARGETS`).
  - Cuando `wealthTargets == null`: renderizar `WealthTargetsOnboarding` como card `span-full` y
    degradar a empty-state las cards que dependen de objetivos ("Nota de la cartera", "Estado del
    plan", "Renta variable real vs objetivo", "Fondo de emergencia / casa"). El resto de la pestaña
    (total, distribución, histórico, composición) se renderiza igual — NO se bloquea toda la pestaña
    (a diferencia de GoalsTab, aquí la mayoría del contenido no depende de los objetivos).
  - Añadir un editor colapsable "Editar objetivos" (botón junto a "Editar cartera") visible cuando
    `wealthTargets != null`, que edita cada campo vía `setWealthTargets` (mismo estilo `.inp`/`.card`
    que el editor de cartera existente).
- `src/features/goals/components/GoalsTab.tsx` — **modificar**:
  - Nuevo prop `wealthTargets: WealthTargets | null` (solo lectura; el Wealth tab es el dueño de la
    edición de estos objetivos).
  - Sustituir `TARGETS.minimumFund`/`TARGETS.emergencyFund` (líneas 70, 134, 137, 140) por
    `wealthTargets`. Fallback de solo lectura a `WEALTH_TARGETS_INITIAL` cuando `wealthTargets == null`
    (GoalsTab no debe mostrar el onboarding de un concepto que no posee; usa el default para pintar la
    card de fondo de emergencia).
  - Corregir el literal hardcodeado `(4.900€)` de la línea 140 para que interpole
    `wealthTargets.emergencyFund` (evita que quede desincronizado tras editar).

## Implementation steps

1. **Domain**: crear `WealthTargets.ts`; borrar `TARGETS` de `config.ts` (dejar `COMPOSITIONS`).
2. **Data**: crear `data/wealthTargets.ts` con `WEALTH_TARGETS_INITIAL`.
3. **Application**: crear `WealthTargetsRepository` (puerto), `LoadWealthTargets`, `SaveWealthTargets`.
4. **Schema + migración**: añadir la tabla `wealthTargets` a `schema.ts`; ejecutar `pnpm db:generate`
   para producir `drizzle/0001_*.sql` + snapshot/journal actualizados.
5. **Infrastructure**: crear `WealthTargetsRowMapper` y `TursoWealthTargetsRepository`.
6. **DI**: registrar `loadWealthTargets`/`saveWealthTargets` en `ContainerDI`.
7. **Server Action**: crear `saveWealthTargets.ts` (userId resuelto en servidor).
8. **App wiring**: `LoadInitialAppState` → `page.tsx` → `FinanceAppShell` (estado + effect de
   persistencia con debounce, espejo del de goals).
9. **UI**: crear `WealthTargetsOnboarding`; refactorizar `WealthTab` (props, editor, empty-states,
   quitar hardcodes 60/20/20); refactorizar `GoalsTab` (prop read-only + fallback).
10. **Tests** (ver estrategia).
11. Verificar: `pnpm lint`, `pnpm test`, `pnpm test:e2e`.

## Testing strategy

- **Unit — use cases** (`*.unit.test.ts`, junto al código):
  - `LoadWealthTargets.unit.test.ts` y `SaveWealthTargets.unit.test.ts` con un
    `FakeWealthTargetsRepository` (espejo de `LoadGoalsSettings.unit.test.ts`): devuelve targets /
    `null`, y verifica que Save delega en el repo con `(userId, targets)`.
- **Unit — mapper** (`WealthTargetsRowMapper.unit.test.ts`): `toDomain(row)` reanida
  `equityTargets` correctamente; `toRow(targets, userId)` aplana en las columnas y clava el `userId`.
- **Integration — Turso** (`TursoWealthTargetsRepository.integration.test.ts`, contra libSQL real vía
  `TestDatabaseFactory`, espejo del test de goals): `find` → `null` sin sembrar; round-trip
  save/find; overwrite en segundo save; **aislamiento por usuario** (`user-1` vs `user-2`). Requiere
  que la migración generada esté en `drizzle/` (la lee el factory).
- **Component** (jsdom + RTL):
  - `WealthTab.unit.test.tsx` — **actualizar** `renderWealthTab` para pasar `wealthTargets` y
    `setWealthTargets`; nuevos casos: con `wealthTargets: null` muestra el onboarding y las cards de
    plan en empty-state; con targets, las cifras de fondo/alertas reflejan los valores.
  - `GoalsTab.unit.test.tsx` — **actualizar** `renderGoalsTab` para incluir `wealthTargets`; caso con
    `null` usa el default para la card de fondo de emergencia.
  - `WealthTargetsOnboarding` — test de que `onCreateTargets` recibe los valores introducidos y que no
    persiste nada al renderizar.
- **E2E Playwright** (`e2e/wealth.e2e.spec.ts`, patrón de `goals.e2e.spec.ts`): editar un objetivo
  (p.ej. fondo de emergencia), esperar el debounce, recargar y verificar que persiste. Ajustar el
  fixture de auth/seed si el usuario de e2e arranca sin `wealth_targets` (decidir: sembrar defaults en
  el setup o cubrir el flujo de onboarding).

## Architecture decisions

- **Replicar el vertical slice de `goals_settings` al pie de la letra**: puerto en `application/`,
  adapter Turso + row mapper en `infrastructure/`, use cases `Load`/`Save` clase-con-`invoke()`,
  registro en el composition root, Server Action fina que resuelve `userId` en servidor. Es el patrón
  de referencia exacto pedido y mantiene la coherencia con budget/portfolio/debts/goals.
- **Persistencia por `user_id` como PK**, sin id singleton "default" — aisla por usuario y usa
  `onConflictDoUpdate` para upsert idempotente.
- **Ubicación del tipo en `domain/` (no `application/`)**: es una desviación consciente respecto a
  `GoalsSettings` (que vive en `application/`). Se justifica porque (a) el task lo pide
  explícitamente, (b) `TARGETS`/la distribución RV ya vivían en `wealth/domain/config.ts`, y (c) un
  DTO de dominio puro sin dependencias de framework es hexagonalmente correcto (application → domain
  es dependencia hacia dentro). Documentado aquí para que la revisión no lo lea como inconsistencia
  accidental.
- **`equityTargets` anidado en el dominio, aplanado en el mapper**: mantiene el dominio expresivo
  (igual que `btcConditions` en goals) sin acoplar el modelo a la forma tabular de SQLite.
- **El Wealth tab es el único dueño de la edición**; el Goals tab solo lee. Evita dos editores del
  mismo dato y un segundo onboarding para un concepto ajeno. GoalsTab cae a `WEALTH_TARGETS_INITIAL`
  para pintar cuando aún no hay objetivos.
- **No bloquear toda la pestaña Patrimonio con el onboarding** (a diferencia de Goals): la mayoría de
  su contenido (patrimonio, distribución, histórico) no depende de los objetivos, así que solo las
  cards de plan degradan a empty-state. Coherente con los empty-states ya presentes en `WealthTab`
  (`portfolio.length === 0`, distribución vacía).
- **YAGNI**: no se introduce un domain service ni value objects con invariantes (p.ej. validar que
  world+em+nasdaq = 100); los objetivos son datos editables libres, igual que `GoalsSettings`. Si más
  adelante se necesita validación, se añade entonces.

## Risks and dependencies

- **Orden de implementación**: el schema y `pnpm db:generate` deben ir ANTES que el test de
  integración (el `TestDatabaseFactory` migra desde `drizzle/`). Sin la migración generada, la tabla
  no existe en dev ni en tests.
- **Migración adicional** (`0001_*`): además del dev DB local (migrado en `predev`) y los tests, hay
  que aplicarla en la Turso real de producción (`pnpm db:migrate`) al desplegar. La tabla es nueva y
  aditiva → sin riesgo para datos existentes.
- **Usuarios existentes** ya registrados no tendrán fila en `wealth_targets` → `find` devuelve `null`
  → verán el onboarding en Patrimonio. Comportamiento esperado y coherente con cómo goals trató a los
  usuarios sin `goals_settings`.
- **Renombrado de campos** (`btcPause`→`btcPauseWeight`, etc.): hay que sustituir TODOS los usos en
  `WealthTab` (líneas 74–95, 403–412) y `GoalsTab` (70, 134–140). No queda ningún consumidor fuera de
  estos dos componentes (verificado: `grep TARGETS` solo aparece en `config.ts`, `WealthTab.tsx`,
  `GoalsTab.tsx`).
- **Tests de componente existentes** de `WealthTab`/`GoalsTab` romperán al añadir props obligatorios;
  sus helpers `renderWealthTab`/`renderGoalsTab` deben actualizarse en el mismo cambio.
- **Fuera de alcance, anotados**: en `WealthTab` línea 412 el divisor `778.89` (gasto mensual) y en
  `GoalsTab` línea 140 el "6 meses de gastos" son cifras no cubiertas por `TARGETS`; NO se tocan aquí
  (podrían ser una futura mejora de configuración de gastos). Sí se corrige el literal `4.900€` de esa
  misma línea porque es exactamente `emergencyFund` y quedaría desincronizado.
