# Plan: Persistencia con Turso (libSQL) para las 3 pestañas

## Goal

Introducir la primera capa de persistencia real del proyecto. Hoy **todo el estado vive en
`useState` dentro de `src/app/page.tsx`** (cliente): cartera, deudas, presupuesto base, meses,
gastos fijos y los parámetros de metas. Se seedea desde ficheros `data/*.ts` en cada arranque y se
pierde al recargar. El objetivo es persistir en Turso (libSQL) las entidades editables por el
usuario, respetando la arquitectura hexagonal + vertical slice ya existente: repositorios como
adapters de infraestructura detrás de puertos, sin acoplar dominio ni aplicación a Turso.

Además, el modelo de datos de Wealth debe dejar **preparada** (no implementada) la tabla de
transacciones (compra/venta, fecha, precio, unidades) para el roadmap futuro de rentabilidad real
(money/time-weighted return al estilo getquin), y así no rehacer el esquema más adelante.

## Affected layers

- [x] domain — sin cambios de tipos de negocio; se reutilizan los tipos actuales como forma canónica que los mappers reconstruyen
- [x] application — nuevos puertos driven (repositorios) + use cases de carga/guardado por feature
- [x] infrastructure — cliente Turso compartido, repositorios libSQL por feature, migraciones
- [x] UI — `page.tsx` deja de seedear desde `data/*.ts`; hidrata desde el servidor y persiste mutaciones vía Server Actions / Route Handlers

## Hallazgos de la exploración (verificado leyendo el código)

### Estado actual persistible (todo en `page.tsx` useState)

| Pestaña | Estado en `page.tsx` | Tipo canónico |
|---|---|---|
| Wealth | `portfolio` | `Position[]` (`features/wealth/domain/types.ts`) |
| Wealth + Goals | `debts` | `Debt[]` (`shared/domain/types.ts`) — **compartido entre dos pestañas** |
| Budget | `baseBudget` | `Budget` (singleton) |
| Budget | `fixedExpenseItems` | `FixedExpenseItem[]` |
| Budget | `months` | `Month[]` (cada uno con `events`, `overrides`, `actual`) |
| Goals | `currentSalary`, `fiContribution`, `fiReturn`, `btcSavings`, `btcConditions`, `countCar` | primitivos + `BtcConditions` |

### Qué NO se persiste (config estática, se queda en `config.ts`)

- `TARGETS`, `COMPOSITIONS` (Wealth) — composición orientativa de índices y umbrales.
- `CATEGORIES`, `CATEGORY_LABEL` (Budget) — catálogo fijo de categorías (`CategoryId`).
- `PHASES`, `FI_GOAL`, `HOUSING_GOAL`, `BTC_OP_GOAL` (Goals) — fases del plan y metas de referencia.

Esto es deliberado: son constantes de dominio, no datos editados por el usuario. Persistirlas
sería violar YAGNI (nadie las muta desde la UI).

### Detalles que condicionan el esquema

- `Position.price` **no** es dato de usuario: lo refresca Yahoo vía `POST /api/prices`
  (`RefreshPositionPrices`). Se persiste `units` + metadatos; `price` se guarda solo como último
  snapshot conocido (para pintar algo antes de que responda Yahoo), nunca como fuente de verdad.
- `Debt` es **compartido** (Wealth y Goals). Va a `src/shared`, no dentro de una feature.
- `Month.overrides` y `Month.actual` son `Partial<Record<CategoryId, number|null>>` (dispersos).
  `Month.events` es `BudgetEvent[]`. Requieren tablas hijas (ver esquema).
- Los `id` hoy se generan con `generateId()` (`Math.random().toString(36)`). Se mantienen como
  claves de aplicación; los seeds de `data/budget.ts` usan `createMonth` + `generateId`.
- Los parámetros de Goals + `baseBudget` son **singletons de un único usuario**. La app es
  monousuario (Aitor); **no** se introduce tabla `user`/auth ahora (YAGNI). Se modelan como filas
  únicas con clave fija (`id = 'default'`).

### Nota de arquitectura sobre el layout

- El proyecto usa **vertical slice** (`src/features/{feature}/{domain,application,infrastructure,components}`),
  no el `src/{domain,application,infrastructure}` global que propone el SKILL de hexagonal. Wealth
  ya tiene `application/` e `infrastructure/`; budget y goals **solo** tienen `domain/` +
  `components/`. Este plan **crea `application/` e `infrastructure/` en budget y goals** por primera
  vez, siguiendo el patrón que wealth ya establece.
- El composition root existente es `src/lib/di/container.ts` (funciones `getX()`), no un contenedor
  con `register/resolve`. Se respeta ese estilo: se añaden `getPortfolioRepository()`, etc.
- **No existe `CLAUDE.md` en la raíz del repo** (solo el global del usuario). No bloquea el plan,
  pero conviene crearlo aparte para fijar convenciones; fuera del alcance de esta tarea.

## Enfoque de Turso elegido

### Cliente y ORM

- **Driver**: `@libsql/client` (fuente de verdad de la conexión). Es el que asumen los SKILLs de
  arquitectura y testing, y soporta `file:` para tests de integración locales.
- **Esquema + migraciones**: **Drizzle ORM** con `dialect: "turso"` + `drizzle-kit`. Motivo: el
  SKILL de hexagonal exige que *"Schema changes go through a migration"*, y `drizzle-kit
  generate/migrate` da ese flujo de primera clase para SQLite/Turso sin tener que escribir a mano
  un runner de migraciones. Drizzle queda **confinado a `infrastructure/`**; dominio y aplicación
  nunca lo importan.
- **Alternativa considerada (raw)**: `@libsql/client` a pelo + ficheros `.sql` aplicados por un
  `MigrationRunner` propio. Más KISS y sin dependencia extra, pero obliga a mantener el runner y
  perdemos el `generate` diff-based. Se descarta por el coste de mantenimiento de migraciones a
  mano; se documenta por si se quiere revertir la decisión.

### Conexión y entorno

- Variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (crear `.env.local` y `.env.example`).
- **Runtime**: Route Handlers / Server Actions corren en Node runtime → usar `@libsql/client`
  (no el subpath `/web`, que es para edge).
- **Tests de integración**: `createClient({ url: "file:test.db" })` (sin authToken), tal como pide
  el SKILL de testing (*"real local libSQL file"*).
- **Embedded replicas**: fuera de alcance (YAGNI). App personal monousuario con poco tráfico; una
  conexión remota directa a Turso Cloud basta. Se deja anotado como opción futura.

### Encaje hexagonal

```
Domain (Position, Debt, Month, Budget…)  ← sin cambios, cero deps
      ↑
Application: puertos driven (PortfolioRepository, DebtRepository, BudgetRepository,
             MonthRepository, GoalsSettingsRepository) + use cases Load/Save
      ↑
Infrastructure: TursoXxxRepository (Drizzle/libSQL) implementan los puertos y mapean fila↔dominio
      ↑
Driving adapters: Server Actions / Route Handlers resuelven use cases desde container.ts
```

## Esquema de entidades a persistir

> Diseñado solo con campos derivables del dominio actual. Claves de aplicación (`text` id) =
> los `id` que ya usa el código.

### Wealth

**`positions`**
- `id` (text, pk), `name` (text), `ticker` (text), `type` (text: fondo|etf|cripto|efectivo),
  `units` (real), `group_name` (text: rv|btc|liquidez), `last_price` (real, nullable — snapshot
  Yahoo, no fuente de verdad), `updated_at` (integer, epoch).

**`position_transactions`** — *preparada para el roadmap de rentabilidad real, NO se calcula ahora*
- `id` (text, pk), `position_id` (text, fk → positions), `kind` (text: buy|sell),
  `executed_at` (integer, epoch — fecha de la aportación), `units` (real),
  `price` (real — precio de compra/venta en €), `fee` (real, default 0, nullable),
  `created_at` (integer).
- Se crea la tabla + el repositorio mínimo (save/find), pero el cálculo money/time-weighted queda
  **explícitamente fuera de este plan** (se abordará cuando el usuario lo pida). Documentar que
  hoy `units` de `positions` sigue siendo la fuente para el patrimonio; en el futuro se derivará de
  la suma de transacciones.

### Shared

**`debts`** (usada por Wealth y Goals)
- `id` (text, pk), `name` (text), `installment` (real), `balance` (real), `note` (text),
  `deadline` (text, nullable — se guarda el string ISO ya existente en `Debt.deadline`).

### Budget

**`budget_base`** (singleton, `id = 'default'`)
- `id` (text, pk), `ingreso_neto` (real), `gastos_fijos` (real), `inversion` (real),
  `fondo_emergencia` (real), `ocio` (real), `caprichos` (real).
- Nota: `gastos_fijos` es la suma de `fixed_expense_items` (así lo calcula `saveBase` en
  `BudgetTab`). Se persiste el total como valor materializado + el desglose en su tabla.

**`fixed_expense_items`**
- `id` (text, pk), `name` (text), `amount` (real), `sort_order` (integer, para estabilidad).

**`budget_months`**
- `id` (text, pk), `date` (integer, epoch — `Month.date`), `label` (text),
  `net_income_override` (real, nullable).

**`budget_month_categories`** (reconstruye `overrides` + `actual`, que son `Partial<Record>`)
- `month_id` (text, fk → budget_months), `category_id` (text: CategoryId),
  `override_amount` (real, nullable), `actual_amount` (real, nullable).
- PK compuesta (`month_id`, `category_id`). Filas dispersas: solo las categorías con override o
  actual. El mapper reconstruye los `Partial<Record<CategoryId, …>>`.

**`budget_events`** (hijos de `Month.events`)
- `id` (text, pk), `month_id` (text, fk → budget_months), `name` (text), `amount` (real),
  `category` (text: EventCategory = CategoryId | "ingreso").

### Goals

**`goals_settings`** (singleton, `id = 'default'`)
- `id` (text, pk), `current_salary` (real), `fi_contribution` (real), `fi_return` (real),
  `btc_savings` (real), `btc_disposable` (integer 0/1), `btc_dca_active` (integer 0/1),
  `count_car` (integer 0/1).
- Modela los `useState` sueltos de Goals + `BtcConditions`. Booleans como `integer` (SQLite).

## Files to create/modify

### Infraestructura de BD (compartida)
- `src/infrastructure/db/client.ts` — construye el `@libsql/client` desde env vars (Node runtime). Único punto que lee `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`.
- `src/infrastructure/db/schema.ts` — definición Drizzle de todas las tablas (solo infraestructura).
- `drizzle.config.ts` (raíz) — `schema`, `out: ./drizzle`, `dialect: "turso"`, `dbCredentials`.
- `drizzle/` (dir) — migraciones generadas por `drizzle-kit`.
- `.env.example` — `TURSO_DATABASE_URL=`, `TURSO_AUTH_TOKEN=`.
- `package.json` — deps `@libsql/client`, `drizzle-orm`; devDeps `drizzle-kit`; scripts `db:generate`, `db:migrate`, `db:studio`.

### Wealth
- `src/features/wealth/application/PortfolioRepository.ts` — puerto (`findAll/save`).
- `src/features/wealth/application/PositionTransactionRepository.ts` — puerto (roadmap, mínimo).
- `src/features/wealth/application/LoadPortfolio.ts` / `SavePortfolio.ts` — use cases `invoke()`.
- `src/features/wealth/infrastructure/TursoPortfolioRepository.ts` — adapter + mapper fila↔`Position`.
- `src/features/wealth/infrastructure/TursoPositionTransactionRepository.ts` — adapter mínimo.

### Shared (debts)
- `src/shared/application/DebtRepository.ts` — puerto.
- `src/shared/application/LoadDebts.ts` / `SaveDebts.ts` — use cases.
- `src/shared/infrastructure/TursoDebtRepository.ts` — adapter + mapper.

### Budget (crea application/ e infrastructure/ por primera vez)
- `src/features/budget/application/BudgetRepository.ts` — puerto (base + fixed items).
- `src/features/budget/application/MonthRepository.ts` — puerto (months + categories + events).
- `src/features/budget/application/LoadBudget.ts` / `SaveBudget.ts` — use cases (agregado completo del tab).
- `src/features/budget/infrastructure/TursoBudgetRepository.ts` — adapter + mapper.
- `src/features/budget/infrastructure/TursoMonthRepository.ts` — adapter + mapper (reconstruye overrides/actual/events).

### Goals (crea application/ e infrastructure/ por primera vez)
- `src/features/goals/application/GoalsSettingsRepository.ts` — puerto.
- `src/features/goals/application/LoadGoalsSettings.ts` / `SaveGoalsSettings.ts` — use cases.
- `src/features/goals/infrastructure/TursoGoalsSettingsRepository.ts` — adapter + mapper (`GoalsSettings` es un tipo nuevo de aplicación que agrupa los primitivos + `BtcConditions`; NO es de dominio de negocio).

### Composition root y driving adapters
- `src/lib/di/container.ts` — añadir `getLoad/SavePortfolio`, `getLoad/SaveDebts`, `getLoad/SaveBudget`, `getLoad/SaveGoalsSettings`, construyendo repos con el client Turso.
- `src/app/actions/*.ts` (nuevos) — Server Actions `savePortfolio`, `saveDebts`, `saveBudget`, `saveGoalsSettings` (driving adapters; resuelven use cases del container, nunca tocan Turso directo).
- `src/app/page.tsx` — dejar de seedear desde `data/*.ts`; convertir a Server Component que hidrata via use cases Load y pasa datos iniciales a un Client Component de shell; las mutaciones llaman a las Server Actions. Los `data/*.ts` pasan a ser **seed inicial de la migración**, no estado runtime.
- Seed de datos: script/migración que inserta `PORTFOLIO_INITIAL`, `DEBTS_INITIAL`, `BUDGET_BASE_INITIAL`, `FIXED_EXPENSES_INITIAL`, `MONTHS_INITIAL` y los defaults de Goals la primera vez.

## Implementation steps

1. Añadir dependencias (`@libsql/client`, `drizzle-orm`, `drizzle-kit`) y scripts `db:*`; crear `.env.example` y documentar `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`.
2. Crear `src/infrastructure/db/client.ts` (factory del client, Node runtime) y `schema.ts` (todas las tablas Drizzle) + `drizzle.config.ts`.
3. `drizzle-kit generate` para la migración inicial; revisar el SQL generado en `drizzle/`.
4. Definir puertos (interfaces) en la capa `application/` de cada feature + shared, dependiendo solo de tipos de dominio.
5. Implementar repositorios Turso en `infrastructure/`, cada uno con su mapper clase (fila↔dominio) siguiendo class-first (p. ej. `PositionRowMapper.toDomain/toRow`).
6. Implementar use cases `Load*`/`Save*` (una clase, un `invoke()`), inyectando los puertos.
7. Ampliar `container.ts` con los `getX()` que construyen client → repos → use cases.
8. Crear Server Actions en `src/app/actions/` como driving adapters.
9. Refactor de `page.tsx`: Server Component que carga estado inicial via use cases y lo pasa a un shell cliente; el shell persiste mutaciones con las Server Actions (con estrategia de guardado: al pulsar "Guardar" en Budget; en Wealth/Goals al confirmar edición — respetando el flujo de borrador que ya existe en los tabs).
10. Seed inicial idempotente a partir de los `data/*.ts` (primera ejecución de migración/seed).
11. Tests unitarios de mappers + use cases (mock de puertos) y de integración de repositorios contra `file:` libSQL.

## Testing strategy

- **Unit**: mappers fila↔dominio (`Position`, `Debt`, `Month` con overrides/actual/events dispersos, `Budget`, `GoalsSettings`) — casos con records parciales vacíos y llenos. Use cases `Load/Save` con puertos mockeados verificando orquestación. Co-locados `*.unit.test.ts` (patrón existente).
- **Integration**: cada `TursoXxxRepository` contra un `createClient({ url: "file:<tmp>.db" })` real, aplicando las migraciones de `drizzle/` antes de cada suite. Verificar round-trip save→findAll, reconstrucción de `Month` (overrides + actual + events), singletons (`budget_base`, `goals_settings`) y cascada de `budget_events`/`budget_month_categories` por mes. Ubicación: `*.int.test.ts` junto al repo (confirmar convención con el SKILL de testing).
- **No** se testea el cálculo de rentabilidad money/time-weighted (fuera de alcance); sí un test mínimo de save/find de `position_transactions` para fijar el contrato de la tabla.

## Architecture decisions

- **Drizzle confinado a infraestructura**; dominio/aplicación solo conocen puertos y tipos de
  dominio. Cumple la regla de dependencias hacia dentro.
- **Vertical slice mantenido**: repositorios/puertos/use cases por feature (no el `src/domain`
  global del SKILL). Se crean `application/` + `infrastructure/` en budget y goals siguiendo el
  precedente de wealth. Se documenta como decisión consciente frente al layout del SKILL.
- **`Debt` en `shared`** porque lo consumen dos pestañas (Law of Demeter / SRP: un único
  `DebtRepository`, no duplicado por feature).
- **Config estática fuera de BD** (YAGNI): `TARGETS`, `COMPOSITIONS`, `CATEGORIES`, `PHASES`, metas
  de referencia se quedan en `config.ts`.
- **Singletons con `id='default'`** para `budget_base` y `goals_settings`: app monousuario, sin
  tabla de usuario ni auth (YAGNI); si en el futuro hay multiusuario, se añade `owner_id`.
- **`price` no persistido como verdad**: solo snapshot; Yahoo sigue siendo la fuente vía el
  gateway ya existente. Evita datos desactualizados en BD.
- **Transacciones preparadas, no calculadas**: tabla + repo mínimo hoy; el cálculo de rentabilidad
  real es un plan posterior. Esto evita rehacer el modelo cuando se aborde el roadmap getquin.
- **Mappers como clases** (class-first), no funciones sueltas.

## Risks and dependencies

- **Refactor de `page.tsx` a Server Component** es el cambio más invasivo: hoy es `"use client"`
  con todo el estado. Hay que separar shell cliente (interactividad/edición) de la carga en
  servidor sin romper los flujos de borrador/"Guardar" ya existentes en cada tab. Riesgo de
  regresión en UX de edición. Orden: hacerlo el último paso, tras tener use cases probados.
- **Estrategia de guardado**: definir por tab cuándo se persiste (Budget ya tiene botón Guardar;
  Wealth/Goals editan inline). Evitar escrituras por cada tecleo (debounce o guardar al confirmar).
- **Migración/seed idempotente**: no duplicar seed en cada arranque; usar `insert … on conflict do
  nothing` o comprobar existencia.
- **`generateId()` con `Math.random`** puede colisionar en teoría; al pasar a claves persistidas
  conviene evaluar `crypto.randomUUID()` en creación futura (no romper ids ya seedeados).
- **Reconstrucción de `Month`**: los `Partial<Record<CategoryId>>` dispersos vienen de dos tablas
  hijas; el mapper debe manejar categorías ausentes sin meter `null` espurios.
- **Env/deploy**: la app necesita `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` en el entorno de
  despliegue; documentar y no commitear `.env.local`.
- **Orden recomendado**: (1) infra BD + schema + migración, (2) shared debts (más simple, valida el
  patrón end-to-end), (3) wealth positions (+ tabla transacciones preparada), (4) budget (el más
  complejo por months/events/categories), (5) goals settings, (6) refactor `page.tsx` + seed.
