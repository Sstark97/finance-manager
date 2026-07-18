# Plan: Liquidación de deudas con histórico y borrado permanente

## Goal
Cuando el usuario liquida una deuda, esta debe **salir de las deudas activas** y pasar a una
**lista separada de deudas liquidadas** (histórico), visible de forma opcional (colapsable, cerrada
por defecto). Además, añadir un **botón de borrado permanente** por deuda —con confirmación para
evitar accidentes— pensado para corregir errores de entrada. Todo con una UX/UI coherente con la
sección actual (colapsable, solo-lectura con modo edición y guardado por borrador).

Esto sustituye el comportamiento actual, donde "Liquidar" simplemente pone el saldo a 0 y la deuda
permanece en la lista activa, sin histórico.

## Affected layers
[x] domain  [x] application  [x] infrastructure  [x] UI

> Nota: la feature de deudas **no** vive en `features/goals`; vive en `src/shared/` (dominio, aplicación
> e infraestructura compartidos) y solo su componente UI está en `features/goals/components/`. El plan
> respeta esa ubicación real y no introduce carpetas nuevas.

## Estado actual (hallazgos de la exploración)
- Modelo `Debt` (`src/shared/domain/types.ts`): `{ id, name, installment, balance, note, deadline? }`.
  No existe ningún concepto de liquidación persistida.
- Tabla única `debts` (`src/infrastructure/db/schema.ts`) scoped por `userId`, con índice por usuario.
- Persistencia: `TursoDebtRepository.saveAll` hace **delete-all + insert-all** de todo el array del
  usuario dentro de una transacción. `SaveDebts`/`LoadDebts` (`src/shared/application/`) solo delegan
  en el repositorio y **no necesitan cambios**.
- Flujo cliente: `FinanceAppShell` mantiene un único array `debts` en estado y lo autoguarda con
  debounce (800 ms) vía la Server Action `saveDebts` (`src/app/actions/saveDebts.ts`). `DebtsSection`
  trabaja sobre un **borrador local** y solo sube cambios con `setDebts(draftDebts)` al pulsar
  "Guardar cambios".
- "Liquidar" hoy (`DebtsSection.tsx:48`) hace `balance: 0` y **mantiene** la deuda en la lista.
  "Eliminar" (`DebtsSection.tsx:50`) filtra la deuda del borrador **sin confirmación**, solo en modo
  edición.
- **Dos consumidores** suman el saldo total de deuda de forma duplicada y ambos deberán contar solo
  las activas: `DebtsSection.tsx:33` (`totalDebt`) y `WealthTab.tsx:68` (`totalDebt`).
- Migraciones: Drizzle-kit (`pnpm db:generate` / `db:migrate`). La migración `0002` ya usa el patrón
  `ALTER TABLE ... ADD ...`. El dev DB local se migra solo vía `predev` (`scripts/setup-local-dev-db.mjs`).

## Decisión de modelo de datos: columna de estado, NO tabla separada
Se evaluaron dos opciones:

- **Opción A — columna `settledAt` (recomendada).** Añadir una columna anulable `settled_at` a la tabla
  `debts`. Una deuda está liquidada si y solo si `settledAt` tiene valor.
- **Opción B — tabla `settled_debts` separada.** Segunda tabla con columnas duplicadas + segundo
  repositorio + segunda Server Action + segundo array en el cliente.

**Se recomienda la Opción A** por:
1. **Coherencia con el esquema existente**: ya se usan columnas anulables como estado opcional
   (`deadline`, `net_income_override`, `last_price`, `equity_index`). Una deuda liquidada es la
   **misma entidad** en un estado posterior de su ciclo de vida, no un tipo distinto.
2. **YAGNI / class-first pragmatismo**: la Opción B duplica columnas y multiplica repositorios/casos de
   uso/acciones sin aportar invariantes nuevas. No hay lógica que justifique el segundo agregado.
3. **Impacto mínimo en la persistencia**: el array `debts` del cliente pasa a contener **tanto activas
   como liquidadas**; el flujo delete-all + insert-all las persiste todas sin tocar
   `TursoDebtRepository`, `SaveDebts`, `LoadDebts`, la Server Action ni el autoguardado.
4. **Retrocompatibilidad**: las deudas existentes tendrán `settled_at = NULL` → todas activas.

**Tipo de columna**: `text("settled_at")` con fecha ISO `YYYY-MM-DD`, replicando el estilo de
`deadline` (texto) para un mapper simétrico y legible, coherente con el formateo `es-ES` de la app.

**Cambio de semántica al liquidar**: al liquidar se **conserva el `balance`** (importe que quedaba
pendiente en el momento de liquidar) y se estampa `settledAt`; **ya no se pone a 0**. Así el histórico
muestra "cuánto saldaste". Las deudas liquidadas se **excluyen** de la deuda total y del patrimonio
neto (dejan de ser un pasivo vivo).

## Files to create/modify

### Domain
- `src/shared/domain/types.ts` — añadir `settledAt?: string` a `Debt`.
- `src/shared/domain/DebtLedger.ts` **(nuevo)** — value object que envuelve `Debt[]` y centraliza la
  partición activas/liquidadas, el total activo y las transiciones. Elimina la duplicación entre
  `DebtsSection` y `WealthTab` (DRY + class-first: agrupa comportamiento e invariantes en una clase
  con nombre en vez de arrow functions sueltas repartidas por los componentes).
- `src/shared/domain/DebtLedger.unit.test.ts` **(nuevo)** — spec del value object.

### Application
- Sin cambios en `SaveDebts` / `LoadDebts` / `DebtRepository`: siguen operando sobre `Debt[]` completo.

### Infrastructure
- `src/infrastructure/db/schema.ts` — añadir `settledAt: text("settled_at")` a la tabla `debts`.
- `drizzle/000X_*.sql` **(nuevo, generado)** — `ALTER TABLE debts ADD settled_at text;` vía
  `pnpm db:generate`. **No editar a mano** el SQL; regenerarlo con drizzle-kit.
- `src/shared/infrastructure/DebtRowMapper.ts` — mapear `settledAt ↔ settled_at`
  (`null ↔ undefined`), mismo patrón que `deadline`.
- `src/shared/infrastructure/DebtRowMapper.unit.test.ts` — añadir casos de round-trip de `settledAt`.
- `src/shared/infrastructure/TursoDebtRepository.integration.test.ts` — añadir round-trip de una deuda
  liquidada y de un array mixto activas+liquidadas.

### UI
- `src/features/goals/components/DebtsSection.tsx` — cambios de comportamiento y de layout (detallados
  abajo): total activo, subsección colapsable de liquidadas, "Liquidar" = estampar fecha + mover,
  borrado con confirmación.
- `src/features/goals/components/DebtsSection.unit.test.tsx` — cubrir los nuevos flujos.
- `src/features/wealth/components/WealthTab.tsx` — `totalDebt` debe contar solo activas (vía
  `DebtLedger.totalActiveBalance()`).
- `src/features/wealth/components/WealthTab.unit.test.tsx` — verificar que la deuda total ignora las
  liquidadas.

## Implementation steps
1. **Domain**: añadir `settledAt?: string` a `Debt`. Crear `DebtLedger` (value object inmutable) con,
   como mínimo: `active(): Debt[]`, `settled(): Debt[]`, `totalActiveBalance(): number` y las
   transiciones `settle(id, settledAt): DebtLedger` (estampa fecha, conserva balance) y
   `discard(id): DebtLedger` (borrado permanente). Métodos con nombre que lean como prosa; cero
   dependencias de framework.
2. **Infra schema + migración**: añadir la columna en `schema.ts` y ejecutar `pnpm db:generate` para
   emitir la migración `ALTER TABLE`. El dev DB local se actualiza solo en el siguiente `predev`.
3. **Mapper**: extender `DebtRowMapper.toDomain`/`toRow` para `settled_at` (null↔undefined), simétrico a
   `deadline`.
4. **UI — cálculos**: en `DebtsSection` y `WealthTab`, sustituir el `reduce` de saldo total por
   `new DebtLedger(debts).totalActiveBalance()`. En `DebtsSection`, derivar `activeDebts` y
   `settledDebts` del ledger tanto para la vista de lectura como para la de edición (sobre el borrador).
5. **UI — liquidar**: reemplazar `settleDebt` (que ponía balance a 0) por una acción que use
   `ledger.settle(id, today)` sobre el borrador, estampando la fecha ISO de hoy. La fila desaparece de
   activas y aparece en el histórico; persiste al "Guardar cambios".
6. **UI — borrar con confirmación**: convertir "Eliminar" en una acción destructiva de dos pasos
   (botón "Eliminar" → confirmación inline "¿Seguro? Sí / Cancelar") para evitar borrados accidentales.
   Disponible tanto en deudas activas como en el histórico de liquidadas (registros permanentes que el
   usuario puede querer purgar). Internamente usa `ledger.discard(id)`.
7. **UI — histórico colapsable**: nueva subsección "Deudas liquidadas (N)" dentro de la tarjeta, con su
   propio toggle, **cerrada por defecto**. Lista cada deuda liquidada con nombre, fecha de liquidación
   (formateada `es-ES`) y el saldo saldado, en estilo atenuado con un check de acento. Estado vacío
   discreto ("Aún no has liquidado deudas.").
8. **UI — jerarquía visual**: "Liquidar" como acción positiva (acento `palette.acc`); "Eliminar" como
   destructiva secundaria (`palette.bad`, más ligera y con confirmación) para que no compita
   visualmente ni se pulse por error. Métricas: "Deuda total" (solo activas) y "Patrimonio neto"
   (activos − deuda activa). Opcional: métrica/etiqueta de "total saldado" en el histórico.
9. **Tests**: añadir/actualizar los specs listados.

## Testing strategy
- **Unit — `DebtLedger`**: partición activas/liquidadas; `totalActiveBalance` excluye liquidadas;
  `settle` estampa fecha, conserva balance y mueve la deuda; `discard` la elimina. Value object puro,
  sin mocks.
- **Unit — `DebtRowMapper`**: round-trip de `settledAt` (presente → `settled_at`; ausente → `null`;
  `null` → `undefined`). Nota: los tests actuales usan `toEqual` sobre objetos sin `settledAt`; en
  Vitest `toEqual` ignora propiedades `undefined`, por lo que **no se romperán**.
- **Unit — `DebtsSection`**: al liquidar, la deuda sale de activas y aparece en el histórico; la deuda
  total excluye liquidadas; el borrado exige confirmación antes de eliminar; el toggle del histórico
  muestra/oculta la lista.
- **Unit — `WealthTab`**: la deuda total cuenta solo activas.
- **Integration — `TursoDebtRepository`** (libSQL local real): round-trip de una deuda liquidada
  (persiste `settled_at`) y de un array mixto activas+liquidadas para el mismo usuario.

## Architecture decisions
- **Columna de estado sobre tabla separada** (justificado arriba): coherencia de esquema, YAGNI,
  impacto de persistencia nulo y retrocompatibilidad.
- **`DebtLedger` como value object de dominio**: la lógica activas/liquidadas y el total la consumen
  DOS componentes; encapsularla en una clase con nombre cumple class-first (comportamiento e
  invariantes juntos, nada de funciones sueltas) y DRY (una sola fuente de verdad), manteniéndose puro
  en `domain/` sin dependencias de framework. Se mantiene mínimo (sin jerarquías especulativas).
- **Casos de uso y repositorio intactos**: la operación sigue siendo "guardar el array completo"; la
  liquidación y el borrado son transiciones sobre datos que el flujo existente ya persiste. No se crean
  casos de uso nuevos porque no hay una operación de negocio nueva a nivel de puerto (KISS/YAGNI).
- **Liquidar y borrar dentro del modo edición**: preserva el modelo de borrador + "Guardar cambios" +
  aviso de "cambios sin guardar" ya existente, sin fugas de acciones destructivas a la vista de solo
  lectura. (Posible mejora futura: acciones rápidas en la vista de lectura, fuera de alcance).
- **Fecha de liquidación**: fecha ISO local del día. La app ya usa `new Date()` inline en componentes
  (cabecera de `FinanceAppShell`), así que un helper local es aceptable; se puede extraer un pequeño
  proveedor de fecha si se quiere testear el sello temporal de forma determinista.

## Risks and dependencies
- **Orden de implementación**: dominio → schema + migración generada → mapper → UI → tests. La columna
  es anulable, así que las deudas existentes quedan como activas (retrocompatible).
- **Migración**: generar el SQL con `pnpm db:generate` (no escribir el `ALTER` a mano). El dev DB local
  se migra en el `predev`; producción vía `pnpm db:migrate`.
- **Cambio de comportamiento de "Liquidar"**: ya no pone el balance a 0. Deudas previamente
  "liquidadas" con el método viejo (balance 0, aún en la lista) aparecerán como activas con saldo 0;
  el usuario puede borrarlas o volver a liquidarlas. Impacto menor, sin migración de datos.
- **Consistencia entre consumidores**: `WealthTab` y `DebtsSection` deben usar el mismo `DebtLedger`
  para el total; si uno se olvida, el patrimonio neto y la deuda total divergirían. El value object
  compartido mitiga este riesgo.
- **Semántica de patrimonio neto**: confirmar que las deudas liquidadas se excluyen del neto (son
  pasado, no pasivo vivo). Documentado como decisión.
- **UX destructiva**: el borrado permanente debe requerir confirmación explícita y diferenciarse
  visualmente de "Liquidar" para evitar pérdidas de datos accidentales (petición central del usuario).
```
