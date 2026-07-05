# Plan: Vertical slice por feature + traducción a inglés + resolución de los 3 avisos

## Goal
Tres frentes en una sola tarea, sobre el estado actual (HEAD `7ecfb99`, git limpio salvo `.claude/workspace/WIP.md` sin trackear):

1. **Resolver los 3 avisos no bloqueantes** de `REVIEW-split-finanzas-components.md` (NaN en formatters, fuga de color de presentación en el dominio, Client Component importando `infrastructure/`).
2. **Traducir todos los identificadores de código de español a inglés** (variables, funciones, métodos, clases, tipos/interfaces, archivos, carpetas), manteniendo en español TODA la UI visible y los *valores* de datos. Incluye la limpieza semántica de los contadores de una letra dentro del JSX de los Tabs (deuda técnica que se había diferido).
3. **Reorganizar a vertical slice (hexagonal por feature)**: `src/features/{wealth,budget,goals}/` con sus propias capas internas (`domain/`, `components/`, y `infrastructure/` donde aplique); `src/lib/` fuera de las features (reservado como futura capa de infra/backend compartida); lo genuinamente compartido entre slices en `src/shared/`.

Sin cambiar el comportamiento observable de las 3 pestañas (salvo la corrección explícita del bug NaN).

## Affected layers
[x] domain — se reparten los tipos, config y calculadores por slice; se retira una fuga de presentación del dominio
[ ] application — NO se crea (sin persistencia ni dependencias que inyectar; YAGNI, igual que en el split previo)
[x] infrastructure — `precios.ts` se relocaliza dentro del slice `wealth` (único consumidor); no se formaliza el port todavía
[x] UI — los 3 Tabs pasan a `features/<slice>/components/`, se renombran y se limpian sus internals; `Metric` a `shared/`

---

## Nota arquitectónica previa: vertical slice vs. el layout del skill

El skill `hexagonal-architecture` propone un layout de **capas globales** (`src/domain`, `src/application`, `src/infrastructure`). El usuario pide **vertical slice** (capas dentro de cada feature). No hay conflicto de principio: el propio skill dice textualmente que su layout es "a starting proposal, not a contract... adjust it once real features land, but keep the underlying principle — dependencies point **inward only**". Vertical-slice + hexagonal ("package by feature, layer within") es compatible siempre que dentro de cada slice las dependencias sigan apuntando hacia el dominio puro y que el grafo entre slices sea acíclico.

**Grafo de dependencias entre slices resultante (DAG, sin ciclos):**
```
shared  ←  wealth  ←  goals
   ↑          ↑          ↑
   └───── budget ────────┘        (budget solo depende de shared/lib)
app (shell) → wealth, budget, goals, shared, lib
lib (transversal) ← todos
```
- `goals` **depende de `wealth`** de forma legítima: las metas (libertad financiera, vivienda, fondo) se calculan a partir de la valoración de la cartera (`PortfolioDerived`) y de los umbrales `TARGETS`. `wealth` es "upstream" de `goals`. No al revés → sin ciclo.
- `budget` es independiente de `wealth`/`goals`.
- Se mantiene la decisión del split previo: **NO** se crean `application/use-cases`, `ports/{driving,driven}` ni `di/` todavía. Vertical slice no obliga a poblarlos; se difieren igual que antes hasta que llegue Turso/precios reales.

**Tensión que señalo explícitamente (no bloqueante):**
- `src/lib/` hoy contiene `format.ts` y `theme.ts`, que son concerns de **presentación**, pero el usuario reserva `src/lib/` como la **futura capa de infra/backend** (Turso/APIs). Sigo la instrucción del usuario (lib se queda fuera de las features como bucket transversal y no se duplica dentro de cada slice), pero dejo anotado que cuando aterrice el backend real convendrá separar `lib/` (utilidades de presentación: format/theme) de la infra compartida (cliente Turso, repos, DI) — p. ej. `lib/format`, `lib/ui` vs. `lib/infra` o un `infrastructure/` a nivel raíz. No se hace ahora (YAGNI).

---

## Estructura de carpetas final

```
src/
├── app/
│   ├── page.tsx                 # SHELL: FinanceApp (was FinanzasApp), estado + navegación
│   ├── AppStyles.tsx            # sin cambios de ubicación (estilos globales de la app)
│   ├── layout.tsx, globals.css, page.module.css, favicon.ico   # intactos
│
├── lib/                         # transversal / futura infra-backend. NO se mueve.
│   ├── format.ts                # formatEuro/… (+ fix NaN, aviso 1a)
│   └── theme.ts                 # palette, chartSeriesColors, seriesColorAt (presentación)
│
├── shared/                      # cross-cutting entre slices
│   ├── ui/
│   │   └── Metric.tsx           # was src/components/Metric.tsx
│   ├── domain/
│   │   └── types.ts             # Debt (was Deuda) — usado por wealth y goals
│   └── data/
│       └── debts.ts             # DEBTS_INITIAL (was DEUDAS_INICIAL)
│
└── features/
    ├── wealth/                  # was "patrimonio"
    │   ├── domain/
    │   │   ├── types.ts               # Position, PortfolioHistoryPoint, PositionType, PositionGroup, Composition, CompositionItem
    │   │   ├── config.ts              # TARGETS (was OBJETIVOS), COMPOSITIONS (was COMPOSICION)
    │   │   ├── PortfolioCalculator.ts # was CarteraCalculator (+ PositionWithValue, PortfolioDerived; SIN color, aviso 1b)
    │   │   └── PortfolioCalculator.unit.test.ts
    │   ├── infrastructure/
    │   │   └── YahooPriceGateway.ts   # was src/infrastructure/precios.ts (aviso 1c)
    │   ├── data/
    │   │   └── portfolio.ts           # PORTFOLIO_INITIAL, PRICE_HISTORY_INITIAL (was CARTERA_INICIAL, HISTORICO_INICIAL)
    │   └── components/
    │       └── WealthTab.tsx          # was PatrimonioTab
    │
    ├── budget/                  # was "presupuesto"
    │   ├── domain/
    │   │   ├── types.ts               # CategoryId, CategoryType, Category, FixedExpenseItem, EventCategory, BudgetEvent, Month, Budget, BudgetDraft
    │   │   ├── config.ts              # CATEGORIES (was CATEGORIAS), CATEGORY_LABEL (was CATEGORIA_LABEL)
    │   │   ├── MonthlyBudgetCalculator.ts      # was PresupuestoMensualCalculator (+ MonthlyBudgetResult)
    │   │   ├── MonthlyBudgetCalculator.unit.test.ts
    │   │   ├── month.ts               # createMonth/monthKey/isMonthAvailable (was presupuesto/mes.ts)
    │   │   └── month.unit.test.ts
    │   ├── data/
    │   │   └── budget.ts              # BUDGET_BASE_INITIAL, FIXED_EXPENSES_INITIAL, MONTHS_INITIAL
    │   └── components/
    │       └── BudgetTab.tsx          # was PresupuestoTab
    │
    └── goals/                   # was "metas"
        ├── domain/
        │   ├── types.ts               # Phase (was Fase), BtcConditions (was CondicionesBTC)
        │   ├── config.ts              # PHASES, FI_GOAL, HOUSING_GOAL, BTC_OP_GOAL
        │   ├── FinancialProjectionCalculator.ts   # was ProyeccionFinancieraCalculator (+ params/result)
        │   └── FinancialProjectionCalculator.unit.test.ts
        └── components/
            └── GoalsTab.tsx           # was MetasTab
```

Carpetas eliminadas al final: `src/domain/`, `src/data/`, `src/components/`, `src/infrastructure/`.

**Decisiones de ubicación de lo compartido:**
- `Metric` → `shared/ui/` (lo usan Wealth y Goals).
- `Debt` (tipo) + `DEBTS_INITIAL` (seed) → `shared/` porque la deuda la **editan** en Goals pero la **leen** en Wealth (patrimonio neto, alerta Apple Watch). Ponerla en `shared` evita que un slice dependa de otro solo por este tipo.
- `PortfolioDerived` y `TARGETS` → se quedan en `wealth/domain/` (son concepto de cartera). `goals` los importa: dependencia `goals → wealth` documentada y acíclica.
- `format.ts` y `theme.ts` → **se quedan en `src/lib/`** por instrucción del usuario (ver tensión arriba).

---

## Resolución de los 3 avisos

### 1a — `formatEuro`/`formatEuroWithCents`/`formatPercent`: NaN renderiza "NaN €"
**Análisis.** `(amount ?? 0)` solo captura `null`/`undefined`, no `NaN`. Hoy los handlers de edición sanean con `parseFloat(x) || 0` (NaN→0) y los calculadores blindan con `|| 0`, así que en la práctica no debería llegar `NaN`. Pero el formatter es un helper de presentación **compartido**: su contrato debe ser "nunca emitir NaN/Infinity", independientemente del llamador (DRY, single-responsibility en el sitio correcto). Además `(amount ?? 0).toLocaleString` con `Infinity` daría "∞ €".

**Fix.** Sanear dentro del propio formatter con `Number.isFinite`, restaurando el comportamiento tolerante del antiguo `(n || 0)` de forma explícita y alineada con el estándar `??`:
```ts
const safe = (value: number): number => (Number.isFinite(value) ? value : 0);
```
Aplicar `safe(amount)` en `formatEuro`/`formatEuroWithCents` y `safe(value)` en `formatPercent`. Es un único punto, cero riesgo, y cubre `NaN` e `Infinity`. Se hace en `src/lib/format.ts` (ubicación sin cambios).

### 1b — `CarteraCalculator` importa `seriesColorAt` (fuga de presentación en el dominio)
**Análisis.** `derivar` asigna un `color` de presentación a cada posición y lo copia en `pieCartera`. `color` en `PositionWithValue` **no se consume en ningún sitio** salvo para construir `pieCartera` (el único lector del color es el `<Pie>`/leyenda de WealthTab). El color se calcula por índice de posición en la cartera completa **antes** de filtrar `valor>0`.

**Fix (mover el color a la UI, fiel al comportamiento).**
- `PositionWithValue`: **quitar** `color`.
- `PortfolioDerived`: **quitar** `pieCartera` (y por tanto quitar el import de `@/lib/theme` del dominio → dominio 100% puro).
- En `WealthTab` derivar el pie localmente a partir de `derivada.withValue`, coloreando por índice original y filtrando después (reproduce EXACTAMENTE el color por índice original + exclusión de ceros):
```ts
const portfolioPie = portfolioDerived.withValue
  .map((position, index) => ({ name: position.name, value: position.value, color: seriesColorAt(index) }))
  .filter((slice) => slice.value > 0);
```
`WealthTab` ya importa `seriesColorAt` (lo usa en el BarChart de composición), así que no añade dependencias nuevas. Es un cambio behavior-preserving (colores idénticos con todas las posiciones en positivo; y preserva el "colorear por índice original, filtrar después"). Nota: `withValue` ya está expuesto en `PortfolioDerived`, no hace falta exponer nada nuevo.

### 1c — `PatrimonioTab` (Client Component) importa `@/infrastructure/precios`
**Análisis.** Roza la regla hexagonal 5 (client components no tocan infrastructure). El único consumidor es Wealth. Sin backend real, el fix "correcto" (driven port `PriceGateway` + use-case + Route Handler/Server Action + composition root) sigue siendo prematuro (el placeholder solo lanza error).

**Decisión.** Como se está adoptando vertical slice y `precios` es **exclusivo de Wealth**, se **mueve dentro del slice**: `src/features/wealth/infrastructure/YahooPriceGateway.ts` (mantiene la función `fetchYahooPrice`, ya en inglés). Esto hace el slice autocontenido y localiza el único seam externo. **Se reconoce explícitamente** que mover el archivo NO elimina la deuda de la regla 5 (un client component sigue importando de `infrastructure/`); solo la localiza. Se documenta el objetivo limpio para cuando llegue el backend: driven port `PriceGateway` en `application/ports/driven`, adaptador en infra, orquestado por un use-case y expuesto por una Route Handler que el cliente consuma vía Server Action — momento en que el componente deja de importar infra directamente. Si en el futuro un segundo slice necesita precios de mercado, se promueve a infra compartida (`src/lib`/`src/infrastructure`). Por ahora YAGNI: vive en Wealth.

---

## Política de traducción español → inglés (regla de consistencia)

**SÍ se traduce (son identificadores de código, nunca visibles al usuario):**
- Nombres de variables, parámetros, funciones, métodos, clases.
- Nombres de tipos e interfaces.
- **Nombres de propiedades** de interfaces/objetos accedidas por nombre literal (p. ej. `Position.nombre → name`, `Fase.salarioMin → minSalary`).
- Nombres de archivos y carpetas.
- Constantes de configuración (nombre de la constante y sus claves internas accedidas por nombre literal).
- Discriminantes de estado de UI que **no** aparecen en datos seed ni se renderizan: `TabId`, `VistaComposicion → CompositionView`, `Alerta.t/.m → Alert.kind/.message`.

**NO se traduce (son datos o texto de UI, se quedan en español):**
- **Todo string de UI visible**: labels, títulos, textos de botones, notas, placeholders, mensajes de alert.
- **Valores de uniones discriminantes que aparecen como claves de datos en seeds/config o que pueden aflorar en la UI**: `PositionType` (`"fondo" | "etf" | "cripto" | "efectivo"`), `PositionGroup` (`"rv" | "btc" | "liquidez"`), `CategoryId` (`"gastosFijos" | "inversion" | "fondoEmergencia" | "ocio" | "caprichos"`), `CategoryType` (`"gasto" | "ahorro"`) y el `"ingreso"` de `EventCategory`. Motivo doble: (i) son claves de literales seed/config y se usan para indexar `Budget`/`Record<CategoryId,…>`; (ii) `"ingreso"` **aflora a la UI** por el fallback `CATEGORY_LABEL[event.category] || event.category` (no hay label para "ingreso"). Traducirlos rompería strings de contenido o exigiría reescribir el fallback.
- **Propiedades de `Budget` bloqueadas a `CategoryId`**: `ingresoNeto, gastosFijos, inversion, fondoEmergencia, ocio, caprichos` se quedan en español, porque se acceden dinámicamente vía `base[category.id]` y `[campo]` (`CampoPresupuestoBaseEditable`). El **tipo** se renombra a `Budget`, pero sus propiedades no. (Resultado consciente: tipo en inglés, claves-dato en español; es la línea de corte "identificadores→inglés, valores-discriminante→español".)
- **IDs de entidad (datos de negocio, tipo clave primaria)**: ids de posición `world/em/nasdaq/btc/liquidez`, ids de deuda `coche/applewatch/kindle/ledger`, claves de `COMPOSITIONS` y de `TARGETS.equityTargets` (`world/em/nasdaq`).

**Combinación con code-semantic (limpieza de una letra).** Se **combina** con la traducción: como hay que editar cada referencia de identificador de todas formas, se limpian a la vez los contadores/params de una letra dentro de los Tabs (`d→debt`, `m→month`, `p→position`, `c→category`, `e/ev→event`, `s→sum`, `i→index`, `k→key`, `f→phase`, `n→item`, `l→label`, `a→alert`, `t→...`). Se hace **un commit por slice** para que cada commit sea autocontenido y revertible; los internals de los Tabs (JSX) son la parte más delicada → verificar cada pestaña en el navegador tras su commit.

---

## Tablas de renombrado (identificadores de alto nivel)

### Carpetas
| Español | Inglés |
|---|---|
| `src/features/patrimonio/` | `src/features/wealth/` |
| `src/features/presupuesto/` | `src/features/budget/` |
| `src/features/metas/` | `src/features/goals/` |
| `src/domain/` | (disuelto en `features/*/domain/` + `shared/domain/`) |
| `src/domain/presupuesto/` | `src/features/budget/domain/` (mes.ts → month.ts) |
| `src/data/` | (disuelto en `features/*/data/` + `shared/data/`) |
| `src/components/` | `src/shared/ui/` |
| `src/infrastructure/` | `src/features/wealth/infrastructure/` |

### Archivos
| Español | Inglés |
|---|---|
| `domain/CarteraCalculator.ts` | `features/wealth/domain/PortfolioCalculator.ts` |
| `domain/PresupuestoMensualCalculator.ts` | `features/budget/domain/MonthlyBudgetCalculator.ts` |
| `domain/ProyeccionFinancieraCalculator.ts` | `features/goals/domain/FinancialProjectionCalculator.ts` |
| `domain/presupuesto/mes.ts` | `features/budget/domain/month.ts` |
| `domain/types.ts` | split → `features/{wealth,budget,goals}/domain/types.ts` + `shared/domain/types.ts` |
| `domain/config.ts` | split → `features/{wealth,budget,goals}/domain/config.ts` |
| `data/initial-state.ts` | split → `features/{wealth,budget}/data/*.ts` + `shared/data/debts.ts` |
| `infrastructure/precios.ts` | `features/wealth/infrastructure/YahooPriceGateway.ts` |
| `components/Metric.tsx` | `shared/ui/Metric.tsx` |
| `features/patrimonio/PatrimonioTab.tsx` | `features/wealth/components/WealthTab.tsx` |
| `features/presupuesto/PresupuestoTab.tsx` | `features/budget/components/BudgetTab.tsx` |
| `features/metas/MetasTab.tsx` | `features/goals/components/GoalsTab.tsx` |
| (los `*.unit.test.ts` acompañan a su calculador con el nuevo nombre) | |

### Tipos e interfaces (nombres) + propiedades (valores de unión → se quedan en español)
| Español | Inglés | Slice |
|---|---|---|
| `Posicion` | `Position` (`nombre→name, tipo→type, participaciones→units, precio→price, grupo→group`; `ticker`, `id` sin cambio) | wealth |
| `TipoPosicion` | `PositionType` (valores `fondo/etf/cripto/efectivo` SIN traducir) | wealth |
| `GrupoPosicion` | `PositionGroup` (valores `rv/btc/liquidez` SIN traducir) | wealth |
| `PuntoHistorico` | `PortfolioHistoryPoint` (`mes→label`, `total`) | wealth |
| `CompItem` | `CompositionItem` (`n→name`, `v→value`) | wealth |
| `Composicion` | `Composition` (`nombre→name`, `paises→countries`, `sectores→sectors`) | wealth |
| `PosicionConValor` | `PositionWithValue` (`valor→value`; se ELIMINA `color`) | wealth |
| `CarteraDerivada` | `PortfolioDerived` (`conValor→withValue`, `invertido→invested`, `liquidezTotal→liquidityTotal`, `rvItems→equityItems`, `rv→equity`, `btcPesoTotal→btcWeightTotal`, `pesoRVde→equityWeightOf`; se ELIMINA `pieCartera`) | wealth |
| `Deuda` | `Debt` (`nombre→name`, `cuota→installment`, `saldo→balance`, `nota→note`, `limite→deadline`) | shared |
| `CategoriaId` | `CategoryId` (valores SIN traducir) | budget |
| `TipoCategoria` | `CategoryType` (valores `gasto/ahorro` SIN traducir) | budget |
| `Categoria` | `Category` (`nombre→name`, `tipo→type`) | budget |
| `GastoFijoItem` | `FixedExpenseItem` (`nombre→name`, `importe→amount`) | budget |
| `CategoriaEvento` | `EventCategory` (`CategoryId | "ingreso"`; `"ingreso"` SIN traducir) | budget |
| `Evento` | `BudgetEvent` (`nombre→name`, `importe→amount`, `categoria→category`) | budget |
| `Mes` | `Month` (`fecha→date`, `mes→label`, `eventos→events`, `real→actual`, `ingresoNetoOverride→netIncomeOverride`; `overrides` sin cambio) | budget |
| `PresupuestoBase` | `Budget` (**propiedades SIN traducir**: `ingresoNeto, gastosFijos, inversion, fondoEmergencia, ocio, caprichos`) | budget |
| `PresupuestoBaseBorrador` | `BudgetDraft` (`gastosFijosItems→fixedExpenseItems`) | budget |
| `CalculoMes` | `MonthlyBudgetResult` (`valores→values`, `ingreso→income`, `totalPresupuestado→totalBudgeted`, `sobrante→surplus`, `real→actual`, `totalReal→totalActual`) | budget |
| `Fase` | `Phase` (`nombre→name`, `edad→age`, `salarioMin→minSalary`, `carteraMin→minPortfolio`, `desc→description`) | goals |
| `CondicionesBTC` | `BtcConditions` (`prescindible→disposable`, `dcaActivo→dcaActive`) | goals |
| `ProyeccionFIParams` | `FinancialProjectionParams` (`inicial→initial`, `aportacion→contribution`, `rentabilidadAnual→annualReturn`, `objetivo→target`, `maxMeses→maxMonths`) | goals |
| `ProyeccionFIResultado` | `FinancialProjectionResult` (`meses→months`, `capitalFinal→finalCapital`) | goals |

### Clases, métodos y singletons
| Español | Inglés |
|---|---|
| `class CarteraCalculator` / `derivar()` / `carteraCalculator` | `PortfolioCalculator` / `derive()` / `portfolioCalculator` |
| `class PresupuestoMensualCalculator` / `calcular()` / `presupuestoMensualCalculator` | `MonthlyBudgetCalculator` / `calculate()` / `monthlyBudgetCalculator` |
| `class ProyeccionFinancieraCalculator` / `proyectar()` / `proyeccionFinancieraCalculator` | `FinancialProjectionCalculator` / `project()` / `financialProjectionCalculator` |

### Funciones exportadas
| Español | Inglés |
|---|---|
| `crearMes` | `createMonth` |
| `claveMes` | `monthKey` |
| `esMesDisponible` | `isMonthAvailable` |
| `fetchYahooPrice` | `fetchYahooPrice` (ya en inglés; solo cambia de archivo/carpeta) |
| `formatEuro`/`formatEuroWithCents`/`formatPercent`/`generateId` | sin cambio (ya inglés) |
| `palette`/`chartSeriesColors`/`seriesColorAt` | sin cambio (ya inglés) |

### Config (constantes + claves internas)
| Español | Inglés |
|---|---|
| `OBJETIVOS` | `TARGETS` (`fondoEmergencia→emergencyFund`, `fondoMinimo→minimumFund`, `pesoRV→equityTargets` [claves `world/em/nasdaq` SIN traducir], `btcPausar→btcPause`, `btcVender→btcSell`, `btcUmbralPausar→btcPauseThreshold`, `btcUmbralVender→btcSellThreshold`) |
| `COMPOSICION` | `COMPOSITIONS` (claves `world/em/nasdaq` SIN traducir) |
| `CATEGORIAS` | `CATEGORIES` |
| `CATEGORIA_LABEL` | `CATEGORY_LABEL` |
| `FASES` | `PHASES` |
| `OBJETIVO_FI` | `FI_GOAL` (`capital`, `edadActual→currentAge`, `edadObjetivo→targetAge`, `rentaMensual→monthlyIncome`) |
| `OBJETIVO_VIVIENDA` | `HOUSING_GOAL` (`masaCritica→criticalMass`, `horizonte→horizon`; valor `"5–10 años"` en español) |
| `OBJETIVO_BTC_OP` | `BTC_OP_GOAL` (`objetivo→target`, `ventana→window`; valor `"sep–dic 2026"` en español) |

### Seeds
| Español | Inglés |
|---|---|
| `CARTERA_INICIAL` | `PORTFOLIO_INITIAL` |
| `HISTORICO_INICIAL` | `PRICE_HISTORY_INITIAL` |
| `DEUDAS_INICIAL` | `DEBTS_INITIAL` |
| `PRESUPUESTO_BASE_INICIAL` | `BUDGET_BASE_INITIAL` |
| `GASTOS_FIJOS_INICIAL` | `FIXED_EXPENSES_INITIAL` |
| `MESES_INICIAL` | `MONTHS_INITIAL` |

### Componentes + props + shell
| Español | Inglés |
|---|---|
| `FinanzasApp` | `FinanceApp` |
| `PatrimonioTab` / `PatrimonioTabProps` | `WealthTab` / `WealthTabProps` |
| `PresupuestoTab` / `PresupuestoTabProps` | `BudgetTab` / `BudgetTabProps` |
| `MetasTab` / `MetasTabProps` | `GoalsTab` / `GoalsTabProps` |
| `Metric`/`MetricProps` | sin cambio (ya inglés) |
| `TabId` valores `patrimonio/presupuesto/metas` | `wealth/budget/goals` (labels de `TABS` en español) |
| Estado shell: `cartera→portfolio, setCartera→setPortfolio, historico→priceHistory, deudas→debts, setDeudas→setDebts, presupuestoBase→baseBudget, setPresupuestoBase→setBaseBudget, meses→months, setMeses→setMonths, gastosFijosItems→fixedExpenseItems, setGastosFijosItems→setFixedExpenseItems, salarioActual→currentSalary, aportacionFI→fiContribution, rentabilidadFI→fiReturn, huchaBTC→btcSavings, condicionesBTC→btcConditions, contarCoche→countCar, derivada→portfolioDerived, tab→tab, setTab→setTab` | |

### Locals notables dentro de los Tabs (regla + ejemplos, no exhaustivo)
- WealthTab: `estanflacion→stagflation, editando→editing, drilldown→drilldown, vista→view, cargandoPrecios→loadingPrices, ultimoHist→lastHistoryTotal, variacion→change, variacionPct→changePercent, deudaTotal→totalDebt, patrimonioNeto→netWorth, diasApplewatch→appleWatchDaysLeft, alertas→alerts, score→score (interno `detalle→breakdown`), comp/compData/compKeys→composition/compositionData/compositionKeys, editar→editPosition, borrar→removePosition, anadir→addPosition, actualizarPrecios→refreshPrices, TIPO_LABEL→POSITION_TYPE_LABEL, tiposDisponibles→availableTypes, filasRV→equityRows, `Alerta`→`Alert`{`t→kind`,`m→message`}`, `CampoPosicionEditable→EditablePositionField`, `VistaComposicion→CompositionView` (valores `paises/sectores→countries/sectors`).` Single-letter en `.map`/`.reduce`/`.filter`: `p→position, s→sum, d→debt, e→slice/event, x→debt, u→priceUpdate, k→key`.
- BudgetTab: `baseEditando→baseEditing, baseGuardadoOk→baseSaved, baseBorrador→baseDraft, nuevoGastoFijo→newFixedExpense, totalGastosFijosBorrador→draftFixedExpensesTotal, iniciarEdicionBase→startBaseEditing, cancelarEdicionBase→cancelBaseEditing, guardarBase→saveBase, editarBaseBorrador→editBaseDraft, editarGastoFijo→editFixedExpense, borrarGastoFijo→removeFixedExpense, anadirGastoFijo→addFixedExpense, mesesDisponibles→availableMonths, ultimoDisponibleId→lastAvailableId, mesId→monthId, mesIdEfectivo→effectiveMonthId, nuevoEvento→newEvent, desgloseAbierto→breakdownOpen, guardadoOk→saved, mes→month, calculo→result, borrador→draft, mesIdSincronizado→syncedMonthId, calculoBorrador→draftResult, hayCambiosSinGuardar→hasUnsavedChanges, totalBase→baseTotal, sinAsignarBase→baseUnassigned, editarOverrideBorrador→editDraftOverride, editarRealBorrador→editDraftActual, editarIngresoOverrideBorrador→editDraftIncomeOverride, guardarDesglose→saveBreakdown, descartarCambios→discardChanges, anadirEvento→addEvent, borrarEvento→removeEvent, datosMesGrafico→monthChartData, evolucionAnual→annualEvolution, datosBaseDonut→baseDonutData, sinAsignarBorrador→draftUnassigned`; `BorradorDesglose→BreakdownDraft`; `CampoPresupuestoBaseEditable→EditableBudgetField`; `CampoGastoFijoEditable→EditableFixedExpenseField`. Single-letter: `c→category, m→month, i→item, e/ev→event, s→sum, n→prev`.
- GoalsTab: `deudaCoche→carDebt, deudaTotal→totalDebt, deudaSinCoche→debtWithoutCar, patrimonioNeto→netWorth, editarDeuda→editDebt, marcarLiquidada→markSettled, diasApplewatch→appleWatchDaysLeft, proyeccion→projection, aniosFI→fiYears, anioObjetivoFI→fiTargetYear, edadObjetivoFI→fiTargetAge, faseActual→currentPhase, faseSiguiente→nextPhase, condFondo→emergencyFundMet, cumplidas→reached`; `CampoDeudaEditable→EditableDebtField`. Single-letter: `d→debt, f→phase, x→debt`.

---

## Cadenas ligadas en runtime (NO verificadas por tsc — checklist crítico)

Los `dataKey`/`nameKey` de recharts son strings sueltos que deben coincidir con las claves de los objetos de datos, y algunos **se renderizan como labels visibles**. Al renombrar propiedades hay que sincronizar a mano y decidir traducción con cuidado:

- **NO traducir (son labels visibles en Legend):** `BudgetTab` `<Bar dataKey="Presupuestado">` y `<Bar dataKey="Real">` — el texto "Presupuestado"/"Real" aparece en la leyenda. Mantener esas claves en español y las claves del objeto `monthChartData` (`Presupuestado`/`Real`) en español.
- **Sincronizar al renombrar la propiedad del objeto de datos:**
  - `CompositionItem`: `n→name`, `v→value` ⇒ actualizar `YAxis dataKey="n" → "name"` y `<Bar dataKey="v"> → "value"` en WealthTab.
  - `PortfolioHistoryPoint.mes → label` ⇒ el objeto seed pasa a `{ label: "Feb 26", total }`; actualizar `<XAxis dataKey="mes"> → "label"` en WealthTab.
  - `monthChartData`: la clave `nombre` del objeto (`c.nombre.split(" ")[0]`) ⇒ si se renombra a `name`, actualizar `<XAxis dataKey="nombre"> → "name"` en BudgetTab.
  - `annualEvolution`: claves internas `mes/ahorroPres/ahorroReal/gastoPres/gastoReal`. Las `Line` ya llevan `name="…"` en español (se quedan), así que las claves internas pueden traducirse (`month/savingsBudgeted/savingsActual/expenseBudgeted/expenseActual`) SIEMPRE sincronizando el `dataKey`; el `<XAxis dataKey="mes">` pasa a la nueva clave.
  - `datosBaseDonut`/`portfolioPie`: `dataKey="value" nameKey="name"` (ya en inglés) — al construir los objetos con `name/value` no hay que tocar los dataKey.
- Los valores string de datos que se muestran (`"Feb 26"`, `"EE.UU."`, `"Gastos fijos"`, `"5–10 años"`, `"sep–dic 2026"`, etc.) se quedan en español.

---

## Implementation steps (orden seguro, commit por paso)

Red de seguridad: git (HEAD `7ecfb99`) + `tsc` + `vitest run` + `next dev`. Tras CADA commit: `pnpm exec tsc --noEmit`, `pnpm test`, y `pnpm dev` + revisar en el navegador la(s) pestaña(s) tocada(s). Comandos: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm dev`.

1. **Baseline.** Confirmar árbol limpio (dejar `WIP.md` sin trackear). Opcional: rama `refactor/vertical-slice-en`.
2. **Aviso 1a (formatters).** Editar `src/lib/format.ts` con el guard `Number.isFinite`. `tsc`+`test`. Commit `fix(format): sanitize NaN/Infinity in currency and percent formatters`.
3. **Slice `shared`** (base de la que dependen los demás):
   - Crear `shared/ui/Metric.tsx` (idéntico), `shared/domain/types.ts` (`Debt` con props en inglés), `shared/data/debts.ts` (`DEBTS_INITIAL`).
   - Actualizar los importadores actuales de `Deuda`/`DEUDAS_INICIAL`/`Metric` (page.tsx, PatrimonioTab, MetasTab, data/initial-state) a los nuevos paths/nombres. Borrar `components/Metric.tsx`.
   - `tsc`+`test`+navegador (las 3 pestañas siguen cargando). Commit `refactor(shared): extract Metric, Debt and debts seed to src/shared`.
4. **Slice `wealth`** (incluye avisos 1b y 1c):
   - Crear `features/wealth/domain/{types,config,PortfolioCalculator}.ts` + test, `features/wealth/data/portfolio.ts`, `features/wealth/infrastructure/YahooPriceGateway.ts`, `features/wealth/components/WealthTab.tsx`. Traducir identificadores + limpiar locals + aplicar 1b (quitar color del dominio, derivar `portfolioPie` en WealthTab) + sincronizar dataKeys de composición e histórico.
   - `goals` y `page.tsx` (aún sin migrar) importan `CarteraDerivada`/`carteraCalculator`/`OBJETIVOS`: actualizar esas líneas al nuevo path/nombre (`PortfolioDerived`, `portfolioCalculator`, `TARGETS`) — edición mínima, tsc la guía.
   - Borrar `domain/CarteraCalculator*.ts`, `infrastructure/precios.ts`, y las partes de `domain/types.ts`/`domain/config.ts`/`data/initial-state.ts` que ya migraron (o vaciarlas si aún quedan restos de otros slices).
   - `tsc`+`test`+navegador (pestaña Patrimonio: editar cartera, añadir/borrar posición, actualizar precios→alert CORS, pie/barras/histórico/composición correctos). Commit `refactor(wealth): vertical slice + english rename + move color to UI + relocate price gateway`.
5. **Slice `budget`:**
   - Crear `features/budget/domain/{types,config,MonthlyBudgetCalculator,month}.ts` + tests, `features/budget/data/budget.ts`, `features/budget/components/BudgetTab.tsx`. Traducir + limpiar locals + **preservar verbatim** el patrón de derivación en render (`syncedMonthId` + `setDraft` durante el render; NO convertir a `useEffect`). Cuidar dataKeys visibles (`Presupuestado`/`Real` en español).
   - Actualizar `page.tsx` a los nuevos imports de budget.
   - Borrar `domain/PresupuestoMensualCalculator*.ts`, `domain/presupuesto/`, restos de types/config/seed de budget.
   - `tsc`+`test`+navegador (pestaña Presupuesto: editar base guardar/cancelar, cargar mes, override/real, guardar/descartar desglose, añadir/borrar evento, ambos gráficos). Commit `refactor(budget): vertical slice + english rename`.
6. **Slice `goals`:**
   - Crear `features/goals/domain/{types,config,FinancialProjectionCalculator}.ts` + test, `features/goals/components/GoalsTab.tsx`. Traducir + limpiar locals. Importa `PortfolioDerived`+`TARGETS` de `wealth`, `Debt`+`DEBTS_INITIAL` de `shared`.
   - Actualizar `page.tsx` a los nuevos imports de goals.
   - Borrar `domain/ProyeccionFinancieraCalculator*.ts`, restos de types/config de goals; a estas alturas `domain/`, `data/`, `components/`, `infrastructure/` deberían quedar vacíos → eliminarlos.
   - `tsc`+`test`+navegador (pestaña Metas: proyección FI, sliders aportación/rentabilidad, fases por salario, editar deudas/liquidar, checkbox coche, hucha BTC, condiciones). Commit `refactor(goals): vertical slice + english rename`.
7. **Shell `app`:** Renombrar `FinanzasApp→FinanceApp`, `TabId` y sus valores (`wealth/budget/goals`), variables de estado (tabla shell). `AppStyles.tsx` sin cambios (importa `palette`). `tsc`+`test`+navegador (navegación entre las 3 pestañas, header/h1 por tab, footer). Commit `refactor(app): rename shell to english, wire slices`.
8. **Cierre:** `pnpm lint` limpio, `pnpm exec tsc --noEmit` limpio, `pnpm test` verde, `pnpm build` opcional. Verificación funcional final completa de las 3 pestañas. Confirmar por grep que no quedan imports a `@/domain`, `@/data`, `@/components`, `@/infrastructure`, ni identificadores españoles de código fuera de la lista "se queda en español".

> Alternativa si se prefiere menos commits: agrupar 3–7 en un único gran commit de refactor y apoyarse solo en `tsc`/`test`. **No recomendado**: los slices tocan JSX delicado (patrón de render de BudgetTab, dataKeys de recharts) y el commit-por-slice localiza cualquier regresión y facilita la revisión.

---

## Testing strategy
- **Unit (dominio, sin mocks — se instancia el dominio real):** los 4 `*.unit.test.ts` existentes se mueven con su calculador y se adaptan a los nombres nuevos (imports de path, `CarteraCalculator→PortfolioCalculator`, `derivar→derive`, `Posicion→Position`, `calcMes`→`calculate`, `crearMes→createMonth`, etc.). Los **valores esperados no cambian** (los valores de dominio como `"efectivo"`, `"world"` siguen en español). Nombres de `describe` a la clase/función en inglés.
  - Añadir 2 aserciones al test de `PortfolioCalculator`: (a) que `PortfolioDerived` ya **no** expone `pieCartera`/`color` (el pie se construye en UI) — o simplemente eliminar cualquier assert sobre `pieCartera` y `color` y no reintroducirlo; (b) opcional: un test de `format` para el guard NaN (`formatEuro(NaN) === formatEuro(0)`), aunque `toLocaleString` depende de locale — si se añade, fijar assert sobre igualdad con `formatEuro(0)`, no sobre el string exacto.
- **Integración Turso:** N/A (sin repos ni DB).
- **Componentes (RTL):** diferido igual que en el split previo (pesados por recharts); se abordan cuando la UI se estabilice.

---

## Architecture decisions (resumen razonado)
1. **Vertical slice sobre capas globales** — permitido por el propio skill hexagonal (layout = "reference shape"); se preserva el principio de dependencias hacia dentro y un DAG entre slices (`shared ← wealth ← goals`, `budget` aislado). `application/ports/di` siguen diferidos (YAGNI).
2. **`shared/` para lo genuinamente transversal** (`Metric`, `Debt` + seed) y **`lib/` intacto** como bucket transversal / futura infra por instrucción del usuario, anotando la tensión presentación-vs-backend para resolver cuando llegue Turso.
3. **Color fuera del dominio** (aviso 1b): el dominio queda 100% puro (sin `@/lib/theme`); el color de presentación se asigna al consumir `PortfolioDerived` en la UI, fiel al comportamiento (color por índice original, filtrar ceros después).
4. **`precios` dentro del slice wealth** (aviso 1c): coherente con vertical slice y único consumidor; se documenta que no elimina la deuda de la regla hexagonal 5 y cuál es el objetivo limpio (port + use-case + Route Handler) para el futuro.
5. **Traducción con línea de corte explícita** (aviso general): identificadores→inglés; valores de unión seed-acoplados, propiedades bloqueadas a `CategoryId`, ids de entidad y todo texto de UI→español. Se justifica por acoplamiento a datos y por fugas a UI (`"ingreso"`).
6. **Combinar traducción + limpieza de una letra**, commit por slice: se edita cada archivo una sola vez y cada commit queda autocontenido y revertible.

## Risks and dependencies
- **Sin red de tests de UI:** la única verificación de los Tabs es `tsc` + navegador. De ahí el commit-por-slice y la verificación funcional exhaustiva por pestaña.
- **dataKeys de recharts** (checklist arriba): no los caza `tsc`; sincronizar propiedad↔dataKey y NO traducir los que son labels (`Presupuestado`/`Real`). Riesgo de gráfico "vacío" o leyenda en inglés si se olvida.
- **Patrón de render de BudgetTab** (`syncedMonthId`/`setDraft` durante el render): copiar verbatim, solo renombrar; no "arreglar" al vuelo ni meter `useEffect`.
- **Fallback `CATEGORY_LABEL[event.category] || event.category`**: al mantener `"ingreso"` en español, sigue mostrando "ingreso" correctamente; NO traducir ese valor.
- **`Budget` con propiedades en español** dentro de un tipo con nombre en inglés: inconsistencia consciente por el acoplamiento a `CategoryId`; documentada para el revisor.
- **Dependencia `goals → wealth`** (`PortfolioDerived`, `TARGETS`): correcta y acíclica; no invertirla.
- **Orden estricto de migración:** `shared` antes de `wealth`; `wealth` antes de `goals` (goals consume tipos/const de wealth); `app` al final. Al migrar un slice, actualizar las líneas de import de los slices aún no migrados (edición mínima guiada por `tsc`).
- **React Compiler / `useMemo`:** conservar los `useMemo` tal cual; no eliminarlos en este refactor.
