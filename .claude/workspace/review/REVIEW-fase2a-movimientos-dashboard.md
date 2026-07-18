# Review: Fase 2a — Registro de movimientos itemizado + Dashboard de patrimonio neto

## Verdict: PASS

No blocking findings. La pieza crítica — la migración de datos contra los datos reales de Turso del
usuario — es **aditiva y no destructiva**, segura de aplicar. `pnpm exec tsc --noEmit` limpio,
86/86 tests dirigidos en verde (331/331 en la suite completa reportado por el agente implementador),
lint limpio.

## Análisis de la migración (`drizzle/0004_opposite_darkhawk.sql`) — la pieza sensible

Revisada línea por línea. Segura de aplicar a la base remota/producción:

- **No hay pérdida de datos posible.** El fichero solo hace `CREATE TABLE`, `CREATE INDEX` e
  `INSERT ... SELECT`. Nunca hace `DROP`, `UPDATE` ni `DELETE` de datos existentes.
  `budget_month_categories.actual_amount` queda intacto.
- **Exclusión de NULL/0 correcta.** `WHERE actual_amount IS NOT NULL AND actual_amount != 0` —
  verificado. Filas con actual nulo o cero no generan movimiento.
- **Fecha correcta.** `occurred_at` = `budget_months.date` (epoch ms), consistente con cómo
  `MonthRowMapper.toDomain` lee `occurredAt` y cómo se escribe `budget_months.date`.
- **Sin riesgo de duplicación.** PK sintética determinista (`'migrated-' || month_id || '-' || category_id`),
  como mucho una fila por (mes, categoría). Una segunda ejecución no duplica silenciosamente: falla
  por colisión de PK (y `CREATE TABLE` falla si ya existe). No es idempotente, pero falla rápido sin
  corromper datos.
- **Atomicidad.** `INSERT ... SELECT` es atómico en SQLite/libSQL.
- **Integridad FK.** `month_id` viene de un `JOIN budget_months`, toda fila insertada referencia un
  mes válido.

Aplicar primero la migración y después el código nuevo es el orden correcto de despliegue (el código
nuevo consulta `budget_movements`, que no existe hasta que corre la migración).

## Semántica del calculador — verificada sin cambios

Para cualquier mes cuyo `actual_amount` fuera un número no-cero `N`, la migración crea exactamente
un movimiento de `N`, así que `actual = sum = N` y el superávit es idéntico al comportamiento previo.
Confirmado contra los tests actualizados.

## Warnings (no bloqueantes)

1. **Semántica de `actual_amount = 0` cambia.** Antes un `0` guardado significaba "registrado como 0
   gastado"; ahora la migración lo excluye y se renderiza como "sin registrar", cayendo al valor
   presupuestado en `totalActual`. Menor, posiblemente más correcto, pero conviene confirmar que
   ningún mes registró intencionadamente un `0` real.
2. **La "copia de seguridad" de `actual_amount` es transitoria.** `toCategoryRows` ahora siempre
   escribe `actualAmount: null`, y `saveAll` borra+reinserta todas las filas de categoría, así que
   los valores originales de `actual_amount` se sobrescriben con `null` en el primer guardado de
   presupuesto del usuario tras el despliegue. Si se quiere una red de seguridad real, hacer un
   snapshot de la columna antes de desplegar; si no, programar una migración de seguimiento que haga
   `DROP COLUMN` de la columna ya muerta.
3. **`TursoMonthRepository.saveAll` reescribe todos los movimientos de todos los meses en cada guardado
   debounced** (mismo patrón que `events`/overrides ya existente). Aceptable para una app de un solo
   usuario ahora mismo, pero escala O(historial total de movimientos) por guardado — es justo la deuda
   que el propio plan señala en §1.4 / nice-to-have #18. Marcar para una ruta de escritura incremental
   más adelante.
4. **`DashboardTab.tsx`** compone la orquestación (patrimonio neto, flujo del mes, progreso FI/fondo
   de emergencia) inline en el componente cliente en vez de un caso de uso `LoadDashboard`. El plan
   solo lo listaba como "posible", y es consistente con el patrón ya existente en `WealthTab`/`GoalsTab`.
   Si la lógica del dashboard crece, extraer un caso de uso mantendría la capa de aplicación testeable.

## Puntos positivos

- Migración genuinamente segura — aditiva, filtrado NULL/0 correcto, IDs deterministas, insert atómico.
- Patrón ARIA de tabs replicado correctamente para el nuevo tab Dashboard.
- Fronteras hexagonales limpias: `BudgetMovement`/`NetWorthCalculator` son dominio puro sin imports de
  framework; mapper/repositorio en infraestructura; `saveAll` borra movimientos antes que meses,
  respetando la FK.
- Tests actualizados como especificaciones, no solo parcheados; nueva cobertura de suma multi-movimiento,
  round-trip de mapeo, y comportamiento del dashboard (exclusión de deudas liquidadas, prompt sin
  presupuesto).
- `BudgetMovement` como interfaz es consistente con la convención ya establecida de `Month`/`BudgetEvent`/
  `Budget` en `types.ts` (sin comportamiento propio), no viola class-first aquí.

## Decisión pendiente del usuario

La migración `0004_opposite_darkhawk.sql` **no se ha aplicado a la base de datos Turso remota de
producción**. Es segura según este análisis, pero al ser una escritura contra datos reales, requiere
confirmación explícita antes de ejecutarla.
