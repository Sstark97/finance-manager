# Plan: Análisis de producto y propuesta priorizada de mejoras (UX/UI + nuevas features)

> Entregable de **análisis / producto**, no de implementación. No contiene pasos técnicos de código.
> Las propuestas están priorizadas (Quick wins · Mejoras grandes · Nice-to-have) y fundamentadas en
> el código real del repo, no en suposiciones.

## Estado de ejecución (2026-07-19)

- **Fase 1 (Quick wins, sección 3.A)** — ✅ completada y commiteada.
- **Fase 2a (Dashboard + registro de movimientos, puntos 7 y 8 de 3.B)** — ✅ completada y
  commiteada, más varias iteraciones de feedback UX directo del usuario tras probar en real
  (gráficos del dashboard, patrimonio neto largo/corto plazo manual, menú de ajustes, gráfico de
  evolución del patrimonio en el dashboard, proyección de amortización de deuda).
- **Fase 2b (categorías+tags, suscripciones, tendencias, push PWA — puntos 9-12 de 3.B)** —
  ⏸️ **PAUSADA A PETICIÓN EXPLÍCITA DEL USUARIO.**
  **No retomar esta fase salvo instrucción explícita del usuario en una conversación futura.**
  Si en algún momento se detecta este plan como "trabajo pendiente" (por ejemplo al iniciar una
  tarea nueva sin relación), **no asumir que hay que continuarlo automáticamente** — el usuario
  quiere decidir él mismo cuándo retomarlo.
- **Fase 3 (Nice-to-have, sección 3.C)** — no iniciada.

## Goal
Evaluar el estado actual de `finance-manager`, compararlo con las principales apps de finanzas
personales del mercado, y proponer un backlog priorizado de mejoras de UX/UI y de nuevas
funcionalidades que aporten valor real para gestionar las finanzas del propietario. El objetivo es
decidir **qué construir después y en qué orden**, no cómo implementarlo.

## Affected layers
Al ser un análisis transversal, las propuestas tocan potencialmente todas las capas. Marcadas las
que se verían afectadas si se aprueban las líneas de trabajo principales:

[x] domain — nuevas entidades candidatas (Transaction/Movimiento, Category configurable, Subscription, Alert)
[x] application — nuevos casos de uso (import CSV, detección de recurrentes, comparativas, export)
[x] infrastructure — cambios de esquema Turso + migraciones (transacciones, categorías, alertas), notificaciones PWA
[x] UI — dashboard unificado, reubicación de Deudas, accesibilidad, tokens de diseño

---

## 1. Estado actual (fundamentado en el repo)

### 1.1 Modelo de datos real (`src/infrastructure/db/schema.ts`)
- `users`, `accounts` — Auth.js v5 (credenciales email+password, bcrypt), multiusuario.
- `positions` + `position_transactions` — cartera con histórico de compraventa (units, price, fee, kind).
- `debts` — `name, installment, balance, note, deadline, settledAt` (histórico de liquidación).
- `budget_base` — presupuesto de **6 campos fijos**: `ingresoNeto, gastosFijos, inversion, fondoEmergencia, ocio, caprichos`.
- `fixed_expense_items` — líneas nominales de gasto fijo con importe y `sortOrder`.
- `budget_months` — mes con `date, label, netIncomeOverride`.
- `budget_month_categories` — por mes y categoría: `overrideAmount` (plan) y `actualAmount` (real, **un único número manual**).
- `budget_events` — ingresos/gastos puntuales del mes (`name, amount, category`).
- `goals_settings` — `currentSalary, fiContribution, fiReturn, btcSavings, btcDisposable, btcDcaActive`.
- `wealth_targets` — colchón de emergencia, mínimo, objetivos RV (world/em/nasdaq), umbrales BTC (pausa/venta por peso y capital).
- Migraciones Drizzle existentes: `0000`–`0003`.

### 1.2 Features implementadas
1. **Patrimonio/Wealth** (`features/wealth`, `WealthTab.tsx` ~38 KB): posiciones editables
   (fondo/etf/cripto/efectivo) agrupadas en rv/btc/liquidez; precios en vivo vía Yahoo con
   **conversión FX multi-moneda → EUR** (`RefreshPositionPrices.ts`, par `XXXEUR=X`); histórico de
   cartera reconstruido a partir de transacciones + histórico de precios (`ComputePortfolioHistory`,
   `PortfolioHistoryCalculator`); composición por país/sector (orientativa); editor de objetivos y
   sección de estructura y fiscalidad.
2. **Presupuesto/Budget** (`features/budget`): modelo de **5 categorías fijas** + ingreso neto;
   líneas de gasto fijo; desglose mensual con overrides por categoría, real vs. plan, eventos
   puntuales y cálculo de superávit (`MonthlyBudgetCalculator`); onboarding.
3. **Metas/Goals** (`features/goals`, `GoalsTab.tsx` ~12 KB): libertad financiera (proyección
   compuesta a 750 k€ / 50 años, `FinancialProjectionCalculator`), meta de vivienda, fondo de
   emergencia, **plan por 5 fases** (por edad/salario/cartera) y operación BTC de bear market.
4. **Deudas/Debts** (`DebtsSection.tsx`, **anidada dentro del tab Metas**): cuota, saldo, nota,
   fecha límite, histórico de liquidación y borrado confirmado.
5. **Auth** multiusuario y **PWA** instalable (`manifest.ts`, iconos, `MobileTabBar`, tipografía
   responsive con `clamp()`).

### 1.3 Fortalezas
- Arquitectura hexagonal limpia y bien testeada (unit + integración Turso real + e2e Playwright).
- Precios en vivo con conversión de divisa; histórico de cartera basado en transacciones reales.
- Presupuesto mensual con real vs. plan y superávit; proyección FI con interés compuesto.
- PWA instalable, barra de tabs móvil, layout responsive.
- Histórico de liquidación de deudas.

### 1.4 Carencias detectadas (hechos, no opiniones)
- **No hay dashboard/home unificado.** La app abre en Patrimonio; no existe una vista que combine
  patrimonio neto (activos − deudas), flujo de caja del mes y progreso de metas de un vistazo
  (grep de `net worth`/`patrimonio neto`/`dashboard` no encuentra ninguna pantalla resumen).
- **Deudas está escondida dentro de Metas** — problema de descubribilidad; es una de las 4 áreas
  y no tiene entrada propia en la navegación.
- **Accesibilidad muy baja**: 353 usos de `style={{…}}` inline frente a **solo 2** atributos
  `aria-*`/`role` en todo `src`. Sin landmarks semánticos, foco ni contraste verificados.
- **No hay registro de movimientos itemizado.** El "real" del presupuesto es **un número manual por
  categoría y mes**; no existe un log de gastos individuales, así que no hay categorización
  automática ni respuesta a "¿en qué se me fue el dinero?".
- **Categorías fijas y hardcodeadas** (`config.ts`, 5 categorías opinadas: "caprichos/tech"…). No se
  pueden crear, renombrar ni reordenar; no hay tags.
- **Sin importación bancaria** (open banking/PSD2 ni CSV): todo es entrada manual.
- **Sin detección de recurrentes/suscripciones** (no hay stream de movimientos del que inferirlas).
- **Sin notificaciones/recordatorios**: `deadline` de deudas se almacena pero no dispara ningún
  aviso; la PWA no usa push.
- **Sin informes ni exportables** (CSV/PDF) ni backup de datos.
- **Sin comparativas mes a mes / tendencias** más allá del histórico de cartera.
- **Contenido de Metas muy hardcodeado** (fases, objetivo FI, ventana BTC "sep–dic 2026"): pensado
  para el propietario, poco configurable.
- **Persistencia por sobrescritura completa con debounce 800 ms** (server actions): sin cola offline
  ni resolución de conflictos pese a ser PWA.

---

## 2. Competidores de referencia (qué hacen bien)

| App | Lo que hace especialmente bien | Idea aplicable aquí |
|---|---|---|
| **YNAB** | Presupuesto por sobres ("dale un trabajo a cada euro"), reglas, edad del dinero | Envelopes/sinking funds; asignar el superávit a metas |
| **Monarch Money** | Dashboard de patrimonio neto unificado (cuentas+inversiones+deudas), tendencias | **Home con patrimonio neto y flujo** |
| **Copilot Money** | UX pulida, categorización automática, detección de suscripciones, revisión mensual | Suscripciones; "recap" mensual |
| **Mint / Credit Karma** | Agregación bancaria, alertas de facturas y presupuesto | Alertas de deadline y sobrepaso |
| **Fintonic** | Open banking España/PSD2, previsión de saldo, avisos | Import bancario ES; previsión |
| **Kubera** | Wealth/patrimonio: cripto, multi-activo, multi-moneda, seguimiento de patrimonio neto | Ya cubierto en parte; multi-moneda de visualización |
| **Monefy / Spendee / Wallet (BudgetBakers)** | Registro rapidísimo de gastos, tags, multi-moneda, informes exportables | **Registro rápido de movimientos**, tags, export |

Patrón común del mercado que aquí falta: **(a)** una pantalla resumen de patrimonio neto, **(b)** un
registro de movimientos que alimenta categorización/tendencias/suscripciones, y **(c)** import de
transacciones (CSV como mínimo, PSD2 como ideal).

---

## 3. Backlog priorizado

### 3.A Quick wins (bajo coste, alto impacto, sin cambio de esquema o mínimo)

1. **Dar entrada propia a Deudas en la navegación.** Sacar `DebtsSection` de dentro de Metas y
   darle su tab (o subsección visible). Coste bajo: el componente ya existe y es autónomo.
2. **Pase de accesibilidad básico.** Landmarks (`<main>`, `<nav>`, `<header>` semánticos), `aria-label`
   en botones-icono, estados de foco visibles y verificación de contraste. Alto impacto dado el 2
   vs. 353 actual. No cambia el modelo de datos.
3. **Recap/resumen del mes en Presupuesto.** Con los datos que ya calcula `MonthlyBudgetCalculator`
   (plan, real, superávit por categoría), añadir una tarjeta "cómo ha ido el mes" y **comparativa
   con el mes anterior** (los datos ya están en `months[]`).
4. **Avisos de fecha límite de deudas.** `deadline` ya se almacena: mostrar badge "vence en X días"
   y ordenar/destacar deudas próximas. Sin backend nuevo (cálculo en cliente).
5. **Exportar a CSV/JSON.** Botón de exportación de cartera, presupuesto y deudas para backup y
   análisis externo. Solo lectura de estado ya cargado; sin esquema nuevo.
6. **Alertas de umbral en Patrimonio.** `wealth_targets` ya define umbrales BTC (pausa/venta) y
   colchón: resaltar visualmente cuando el estado real cruza un umbral. Datos ya presentes.

### 3.B Mejoras grandes (aportan valor estructural; requieren esquema/casos de uso nuevos)

7. **Home / Dashboard unificado (patrimonio neto).** Nueva pantalla inicial que combine:
   patrimonio neto (activos de cartera − saldo de deudas), flujo del mes (ingreso − real) y
   progreso de metas. Reutiliza `portfolioCalculator.derive`, `MonthlyBudgetCalculator` y las
   metas. Es la carencia #1 frente a Monarch/Kubera.
   - Domain: posible `NetWorthCalculator` (activos − pasivos).
   - Application: `LoadDashboard` orquestando lo ya cargado en `LoadInitialAppState`.

8. **Registro de movimientos itemizado (la palanca que desbloquea el resto).** Introducir una
   entidad `Movimiento`/`Transaction` de presupuesto (fecha, importe, categoría, nota, tag) que
   sustituya al "actual" como número único. El `actualAmount` por categoría pasaría a ser la suma
   de movimientos.
   - Domain: entidad `Transaction` + agregación a `MonthlyBudgetCalculator`.
   - Infra: **nueva tabla + migración**; nuevo repositorio Turso.
   - Nota YAGNI/hexagonal: hoy `budget_month_categories.actualAmount` es escalar. Esta es la
     decisión de diseño de mayor alcance del plan (ver §4). **Es el prerequisito** de suscripciones,
     categorización y tendencias reales.

9. **Categorías configurables + tags.** Migrar las 5 categorías hardcodeadas de `config.ts` a datos
   por usuario (crear/renombrar/reordenar/color) y añadir tags libres a los movimientos.
   - Infra: tabla `categories` por usuario + migración; `CategoryId` deja de ser union hardcodeada.
   - Riesgo: afecta a `MonthlyBudgetCalculator`, mappers y a los tipos `CategoryId`/`EventCategory`.

10. **Detección de gastos recurrentes / suscripciones.** Sobre el registro de movimientos (#8):
    caso de uso que detecte importes/nombres recurrentes y los liste con coste mensual/anual y
    próxima fecha. Alineado con Copilot/Rocket Money.

11. **Comparativas y tendencias.** Serie mensual de gasto por categoría, tasa de ahorro y evolución
    del superávit (equivalente presupuestario al histórico de cartera que ya existe).

12. **Notificaciones push PWA.** Recordatorios de deadline de deuda, sobrepaso de presupuesto y
    cruces de umbral. Requiere service worker con push + almacenamiento de suscripciones.

### 3.C Nice-to-have (valor real pero menor prioridad o mayor coste/beneficio dudoso para app personal)

13. **Import bancario open banking (PSD2, p. ej. GoCardless/Tink/Nordigen).** Máximo valor
    (elimina entrada manual) pero alto coste de integración, credenciales y mantenimiento para una
    app personal. **Recomendación: empezar por import CSV (quick win #5 inverso) y dejar PSD2 como
    fase posterior** una vez exista el registro de movimientos (#8).
14. **Simulaciones "what-if" interactivas.** Extender `FinancialProjectionCalculator` a escenarios
    ajustables en vivo (¿y si aporto +100€? ¿y si liquido antes la deuda X?). Base de cálculo ya
    existe; es sobre todo UI.
15. **Metas de ahorro por categoría / sinking funds (estilo YNAB).** Asignar el superávit mensual a
    objetivos concretos (vacaciones, coche…). Encaja con la meta de vivienda ya presente.
16. **Multi-moneda de visualización.** Hoy todo se muestra en EUR (la conversión FX ya existe en
    `RefreshPositionPrices`). Baja prioridad: el propietario opera en EUR.
17. **Calendario fiscal (España).** Con `position_transactions` se puede calcular P&L realizado y
    avisar de hitos IRPF/renta. Interesante pero nicho.
18. **Modo offline real / cola de escritura.** Dado que ya es PWA, encolar cambios y resolver al
    reconectar en vez de sobrescritura debounced. Mejora de robustez, no de feature.

---

## 4. Architecture decisions (con razonamiento)

- **El registro de movimientos (#8) es la decisión pivote.** Hoy el presupuesto es agregado
  (escalar `actualAmount`). Muchas features del mercado (categorización, suscripciones, tendencias,
  import) **presuponen movimientos individuales**. Recomendación: **no** construir suscripciones ni
  import antes de decidir sobre #8, para no crear features huérfanas sobre un modelo agregado.
  Alternativa YAGNI si no se quiere el salto: quedarse en agregado y limitar el alcance a #3, #4,
  #7, #11 (todo calculable sobre el modelo actual). Documentar la elección antes de tocar esquema.
- **Categorías configurables (#9) rompe una union type** (`CategoryId`). Debe ir acompañada de
  migración de datos de las 5 categorías actuales a filas por usuario, y de revisar
  `MonthlyBudgetCalculator`, mappers y `config.ts`. Hacerlo idealmente **junto o después de #8**.
- **Respeto de hexagonal**: toda feature nueva sigue el patrón del repo — dominio puro,
  caso de uso con `invoke()`, puerto + repositorio Turso, registro en `ContainerDI`. Las carpetas
  `features/<x>/{domain,application,infrastructure,components}` ya existen; un nuevo `features/movements`
  (o extensión de `budget`) encaja sin scaffolding especulativo.
- **Deuda de UI transversal**: los 353 estilos inline dificultan accesibilidad, dark mode y
  consistencia. Antes de crecer en pantallas, conviene extraer tokens/estilos compartidos
  (`lib/theme.ts` ya centraliza la paleta) — mejora de mantenibilidad que habilita #2 y el dashboard.

## 5. Riesgos y dependencias
- **Orden recomendado**: primero Quick wins (§3.A) por su bajo coste; luego decidir el pivote #8
  (movimientos) porque condiciona #9, #10, #11 y el import PSD2 (#13). El Dashboard (#7) puede
  hacerse en paralelo porque solo consume datos ya existentes.
- **Migraciones**: #8 y #9 requieren nuevas tablas y migración de datos existentes (categorías,
  actuales). Todo cambio de esquema pasa por migración Drizzle (nunca edición en caliente).
- **PSD2**: dependencia externa de proveedor (credenciales, cumplimiento, coste). Riesgo/beneficio
  desfavorable para app personal frente a CSV; degradar a nice-to-have.
- **Contenido hardcodeado en Metas**: convertirlo en configurable es deseable pero de bajo ROI si el
  único usuario es el propietario; priorizar por debajo de dashboard y movimientos.
- **Accesibilidad e inline styles**: refactor transversal; hacerlo incrementalmente por pantalla
  para no bloquear features.

## 6. Testing / validación de producto (no de implementación)
- Validar cada quick win contra el estado real que ya renderizan los tabs (comparar con los
  cálculos existentes de `MonthlyBudgetCalculator` y `portfolioCalculator`).
- Antes de comprometer #8/#9, prototipar el modelo de datos y confirmar que `MonthlyBudgetCalculator`
  puede derivar el "real" desde la suma de movimientos sin romper el superávit ni los tests de
  integración Turso actuales.

---

### Resumen ejecutivo (una línea por prioridad)
- **Quick wins**: tab propio para Deudas, accesibilidad, recap mensual + comparativa, avisos de
  deadline, export CSV/JSON, alertas de umbral.
- **Grandes**: Dashboard de patrimonio neto, registro de movimientos (pivote), categorías+tags
  configurables, detección de suscripciones, tendencias, push PWA.
- **Nice-to-have**: import PSD2, what-if interactivo, sinking funds, multi-moneda, calendario fiscal,
  offline real.
