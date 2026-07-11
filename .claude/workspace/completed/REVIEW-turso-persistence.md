# Review: Persistencia con Turso (libSQL) — 2ª pasada

## Verdict: PASS

Segunda pasada sobre el mismo plan. Las tres advertencias de mayor prioridad de la
primera review (atomicidad transaccional, robustez del seed, flush del debounce) se
han atendido correctamente, y los dos bugs nuevos (deadlock `SQLITE_BUSY` y bucle de
fetch en `WealthTab`) están resueltos. Todos los ítems bloqueantes del checklist
(TypeScript, hexagonal, class-first, semántica, tests) se siguen cumpliendo.

Verificaciones re-ejecutadas de forma independiente en esta review:

- `pnpm exec tsc --noEmit` → `No errors found`.
- `pnpm test` → 34 archivos, 129 tests, todos en verde.
- Zero `any` y zero `||` en la lógica nueva de persistencia (grep sobre
  application/infrastructure/actions/`FinanceAppShell`/`LoadInitialAppState`).

## Blocking findings

Ninguno.

Comprobaciones puntuales de lo que se pidió revisar:

1. **Transacciones** — Las 4 escrituras multi-statement están envueltas en
   `this.database.transaction(async (transaction) => { ... })` y usan `transaction`
   de forma consistente dentro del callback; **no** se cuela ninguna referencia a
   `this.database` dentro de ningún callback (verificado en
   `TursoDebtRepository.ts:19`, `TursoPortfolioRepository.ts:20`,
   `TursoBudgetRepository.ts:37`, `TursoMonthRepository.ts:30`). En
   `TursoMonthRepository.saveAll` el orden es correcto: borra hijos antes que el
   padre (`budgetEvents` → `budgetMonthCategories` → `budgetMonths`) e inserta el
   padre antes que los hijos. El deadlock se evita porque el guardado que orquesta
   estas transacciones ahora es secuencial (`SaveBudget.ts:16-18`,
   `LoadInitialAppState.seed`) y el cliente libSQL lleva `timeout` (busy-timeout).

2. **`timeout` del cliente** — Confirmado que `timeout` es un campo válido del
   `Config` de `@libsql/core` documentado como *"Busy timeout in milliseconds for
   local `file:` databases"* (`@libsql/core/lib-esm/api.d.ts:54-63`). El fix es
   semánticamente correcto, no solo type-check-correcto. Aplicado en
   `client.ts:16` y `TestDatabaseFactory.ts:21`.

3. **Seed secuencial + re-check** — `goalsSettings` se siembra en último lugar y solo
   tras confirmar los otros tres saves secuencialmente
   (`LoadInitialAppState.ts:65-74`). El caso de fallo parcial está bien resuelto y
   **testeado** (`LoadInitialAppState.unit.test.ts:86` — si un slice falla, goals no
   se escribe y el siguiente arranque reintenta). El re-check está testeado en
   `:98`. (Ventana residual benigna anotada abajo.)

4. **Flush-on-unmount** — El patrón de ref es correcto. Cada efecto guarda su
   `persistX` en `pending*Flush.current` y un único efecto con deps `[]`
   (`FinanceAppShell.tsx:61-68`) invoca los cuatro flushes **solo** en el unmount
   real (cleanup de un efecto con array de deps vacío). No dispara en cada cambio de
   dependencia (el intento ingenuo previo). `persistX` pone su ref a `null` antes de
   guardar, así que no hay doble-save entre el flush manual y el `clearTimeout`.

5. **React Compiler + IIFE** — `useCallback` restaurado exactamente en las dos
   funciones que alimentan deps de `useEffect` (`refreshPrices`
   `WealthTab.tsx:124`, `loadHistory` `:150`). Los `useMemo`→IIFE que quedaron
   (`appleWatchDaysLeft`, `alerts`, `score` en WealthTab; `appleWatchDaysLeft`,
   `projection`, `currentPhase` en GoalsTab; totales en BudgetTab) son derivaciones
   puras cuya identidad no alimenta ningún efecto. Seguro.

6. **e2e** — Selectores 100% semánticos (`getByRole` con `button`/`textbox`/
   `spinbutton` + name), sin CSS ni estructura DOM frágil. Verifican persistencia
   real: editan → `waitForTimeout` (> debounce de 800ms) → `page.reload()` →
   re-consultan el valor, así que comprueban Turso y no solo estado de React. BD de
   test aislada en `os.tmpdir()` vía `file:` (`playwright.config.ts:10`,
   `prepare-database.mjs:17-23`), nunca Turso Cloud, y fuera del árbol del proyecto
   para no disparar el file-watcher de Next.

## Warnings (non-blocking)

- `src/app/LoadInitialAppState.ts:69` — El re-check de `checkHasBeenSeeded` **no
  cierra del todo** una carrera de doble arranque genuinamente concurrente: si dos
  peticiones entran a la vez, ambas pasan el check inicial (goals ausente), ambas
  siembran portfolio/debts/budget, ambas re-chequean (goals aún no escrito por
  ninguna) y ambas escriben goals. El re-check solo protege frente a re-entrada
  *secuencial*, no concurrente. **Impacto real: benigno** — todas las escrituras de
  seed son idempotentes con datos idénticos (`onConflictDoUpdate` en los singletons;
  `delete`+`insert` de los mismos ids en las colecciones), así que el peor caso es
  una doble escritura idéntica, sin corrupción. Cierre definitivo solo con un
  marcador de seed atómico o un lock; no merece la pena para una app monousuario.

- `src/features/budget/application/SaveBudget.ts:16-18` — Las tres escrituras
  (`saveBase`, `saveFixedExpenseItems`, `saveAll(months)`) son tres transacciones
  independientes, una por repositorio. Si `saveAll(months)` falla tras haber
  guardado base y fixed-expenses, el presupuesto queda parcialmente persistido. Es
  la misma *clase* de riesgo de atomicidad que el fix resolvió a nivel de repo, pero
  a nivel de caso de uso: no hay unit-of-work que abarque varios repos. Riesgo bajo
  (mismo cliente, secuencial, busy-timeout) y aceptable para un solo usuario, pero
  conviene tenerlo en el roadmap si budget crece.

- `src/features/wealth/components/WealthTab.tsx:144-148` — `refreshPrices` se
  dispara en el mount y setea `portfolio` desde la respuesta de precios. En la app
  real esto compite con la hidratación inicial; el e2e lo sortea esperando el primer
  POST `/api/prices`, pero el `.catch(() => {})` de ese `waitForResponse`
  (`wealth.e2e.spec.ts:17`) se traga el timeout y el test continúa igualmente. Es una
  elección de resiliencia razonable, solo anotarlo: si el backend de precios nunca
  responde, el test edita sobre un estado potencialmente pre-refresh.

- `vitest.config.ts:6` — Declarar `exclude` explícito **sobrescribe** los defaults de
  Vitest (dist, .idea, .git, config files…). Hoy inocuo porque `testMatch` no captura
  esos ficheros, pero si en el futuro aparece un `*.test.ts` dentro de `dist/` se
  colará. Mejor `exclude: [...configDefaults.exclude, "**/e2e/**"]`.

## Positive points

- Fix de atomicidad limpio y uniforme en los 4 repos, con `transaction` usado de
  forma consistente y orden de borrado/inserción correcto respecto a las FKs.
- El deadlock se atacó por la raíz (secuencialidad de las escrituras que comparten
  la única conexión de fichero) **y** con defensa en profundidad (busy-timeout),
  usando el campo semánticamente correcto del `Config` de libSQL.
- El patrón flush-on-unmount es correcto y sutil de acertar; el agente corrigió su
  primer intento ingenuo y el resultado no dispara en cambios de dependencia ni
  produce dobles guardados.
- Cobertura de tests del seed excelente: caso ya sembrado, caso no sembrado, retorno
  de datos frescos, **fallo parcial que preserva el reintento** y re-check
  concurrente — todos mockeando solo en el puerto.
- e2e con selectores semánticos, verificación de persistencia tras reload real y BD
  de test aislada en `tmpdir` (nunca Turso Cloud), con el motivo del aislamiento
  documentado como *why* legítimo (constraint externo del file-watcher de Next).
- React Compiler activado con la disciplina correcta: `useCallback` solo donde la
  identidad alimenta un efecto; el resto de memos convertidos a IIFE puros.

---

# Review: Unit-of-Work de Budget (atomicidad cross-repo en SaveBudget) — 3ª pasada

## Verdict: PASS

Pasada acotada sobre el único punto de deuda técnica no bloqueante que quedó anotado
en la 2ª pasada (ver Warning `SaveBudget.ts:16-18` arriba): las tres escrituras de
`SaveBudget` eran tres transacciones independientes, sin unit-of-work cross-repo, con
riesgo de presupuesto parcialmente persistido si la 2ª o 3ª fallaba. **Este cambio
resuelve esa deuda.** Todos los ítems bloqueantes del checklist se siguen cumpliendo.

Verificaciones re-ejecutadas de forma independiente en esta review:

- `pnpm exec tsc --noEmit` → `No errors found` (la unión `DatabaseExecutor` compila
  limpio en `.transaction()`/`.insert()`/`.delete()`/`.select()`).
- `pnpm exec vitest run` sobre `SaveBudget.unit.test.ts` (1) y
  `TursoBudgetTransactionRunner.integration.test.ts` (2, incluido el rollback real) →
  3 tests en verde.
- Lectura directa del fuente instalado de drizzle
  (`node_modules/drizzle-orm/libsql/session.js:60-103`) para confirmar el
  comportamiento de las transacciones anidadas, sin fiarme de la lectura previa.

## Blocking findings

Ninguno.

Comprobaciones puntuales de lo que se pidió revisar:

1. **Diseño Unit-of-Work correcto, sin nuevo riesgo de atomicidad** — No existe ruta
   donde `saveFixedExpenseItems`/`saveAll` pierdan atomicidad. Los dos únicos métodos
   multi-statement **siempre** se envuelven en `this.database.transaction(...)`
   (`TursoBudgetRepository.ts:37`, `TursoMonthRepository.ts:30`): cuando `this.database`
   es la conexión base (lecturas de `LoadBudget`, repos de lectura de los tests) abren
   una transacción de nivel superior atómica; cuando es una transacción activa (caso
   `SaveBudget` vía runner) abren un SAVEPOINT anidado. En ambos casos quedan envueltos.
   `saveBase` es un único statement (`insert ... onConflictDoUpdate`,
   `TursoBudgetRepository.ts:24-29`), atómico por sí mismo. El flujo de guardado
   (`SaveBudget.ts:12-16`) ya no tiene ninguna ruta de escritura parcial.

2. **Transacciones anidadas (SAVEPOINT) reales** — Verificado en el fuente instalado,
   no solo en la descripción: `LibSQLTransaction.transaction()`
   (`drizzle-orm/libsql/session.js:89-103`) emite `savepoint sp<N>` /
   `release savepoint` / `rollback to savepoint`, y el `transaction()` externo
   (`session.js:60-78`) hace `libsqlTx.commit()` en éxito y `libsqlTx.rollback()`
   completo ante cualquier throw. El re-throw del savepoint interno propaga hasta el
   rollback de la transacción externa, así que un fallo en cualquier paso deshace las
   tres escrituras. El SAVEPOINT `release` no confirma nada por sí mismo: se fusiona en
   la transacción envolvente y cae con su rollback final.

3. **`LoadBudget` no afectado** — Solo lee (`findBase`, `findFixedExpenseItems`,
   `findAll`, todas vía `this.database.select()`). El constructor pasó a aceptar
   `DatabaseExecutor` (tipo más ancho); `getLoadBudget` (`container.ts:69-71`) sigue
   pasando la `Database` base, que es asignable a la unión. Sin efecto negativo.

4. **El test de integración demuestra atomicidad real, no un falso positivo** — Los
   repos de lectura (`readBudgetRepository`/`readMonthRepository`) se construyen contra
   la conexión base, separada de la transacción, y se consultan **después** de que
   `runAtomically` haya rechazado (transacción ya cerrada). El caso de rollback
   (`:48-61`) revisa `inversion:999` + `saveAll([])` (borra todos los meses) y luego
   lanza; las asserts exigen que persistan los valores **originales**
   (`initialBudget`/`initialMonths`), no simplemente que no crashee. Si el rollback no
   ocurriera, `findBase` devolvería 999 y `findAll` devolvería `[]`, así que las asserts
   distinguen de verdad rollback de no-rollback, y verifican que **ambas** escrituras se
   revirtieron (budget + months). BD `file:` real, con lo que SAVEPOINT/rollback se
   comportan como en producción.

5. **Conformidad con las skills** — hexagonal: el puerto `BudgetTransactionRunner`
   (`application/BudgetTransactionRunner.ts`) solo importa los puertos de dominio/
   aplicación (`BudgetRepository`, `MonthRepository`), cero Drizzle; el adaptador
   `TursoBudgetTransactionRunner` (infrastructure) es quien conoce `Database` y los
   repos Turso. Drizzle sigue confinado a `infrastructure/`. class-first: `SaveBudget`
   depende del puerto, no de los repos concretos; el `StubBudgetTransactionRunner` del
   unit test demuestra que el boundary es mockeable. **Sobre-ingeniería: no** — el UoW
   está acotado a Budget, sin abstracción genérica global; es proporcionado al bug real
   que arregla (YAGNI respetado).

## Warnings (non-blocking)

- `src/features/budget/infrastructure/TursoBudgetTransactionRunner.ts:12-13` — El
  `new TursoBudgetRepository(transaction)` / `new TursoMonthRepository(transaction)`
  vive fuera del composition root, lo que roza la regla class-first de "construcción
  solo en el composition root". Es **aceptable y por diseño**: los repos ligados a
  transacción solo pueden construirse dentro del callback, porque el objeto `transaction`
  no existe antes; el runner es, en sí mismo, el punto de composición transaccional
  (infraestructura construyendo infraestructura de su misma capa, no una hoja de UI
  tirando de infra). La alternativa —inyectar factorías de repos— es más indirección
  sin beneficio para este caso. Sin acción requerida; solo anotado.

- `src/features/budget/infrastructure/TursoBudgetRepository.ts:37` /
  `TursoMonthRepository.ts:30` — Se mantiene el patrón de que cada repo abra su propia
  transacción también cuando ya corre dentro del runner (SAVEPOINT anidado). Preserva la
  atomicidad standalone de cada repo, a coste de dos savepoints extra por `SaveBudget`.
  Coste despreciable y decisión razonable; solo dejar constancia de que la atomicidad
  del guardado completo **no** depende de esos savepoints internos sino del `runAtomically`
  externo — los internos son defensa para el uso standalone.

## Positive points

- El fix resuelve la deuda anotada en la 2ª pasada con la mínima superficie: un puerto
  acotado a Budget + un adaptador, sin unit-of-work genérico especulativo.
- Separación de capas impecable: el puerto en `application/` no toca Drizzle; el tipo
  `DatabaseExecutor = Database | DatabaseTransaction` (`client.ts:6-7`) permite que los
  mismos repos sirvan para lectura base y escritura transaccional sin duplicarlos.
- El test de rollback verifica atomicidad **real** contra una BD `file:` (revierte las
  dos escrituras, no solo comprueba ausencia de crash), y el unit test aísla el caso de
  uso mockeando únicamente en el puerto (`StubBudgetTransactionRunner`).
- Verificación del comportamiento de SAVEPOINT hecha contra el fuente instalado de
  drizzle, no asumida.
