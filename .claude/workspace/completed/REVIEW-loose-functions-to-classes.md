# Review: Eliminar funciones sueltas exportadas → clases (class-first)

## Verdict: PASS

## Blocking findings
- Ninguno.

## Warnings (non-blocking)
- `src/features/budget/domain/MonthFactory.ts:1` — se importa `IdGenerator` (tipo) y `idGenerator`
  (valor) del mismo módulo; correcto, pero convendría `import type { IdGenerator }` para dejar
  explícito que la clase solo se usa como anotación de tipo. Trivial, no afecta a compilación ni
  comportamiento.
- No hay test de `CurrencyFormatter`/`IdGenerator` (coherente con el plan: `format.ts` tampoco lo
  tenía y `toLocaleString` depende del locale del runner). Los renders existentes lo cubren
  indirectamente. Aceptable.

## Positive points
- **Comportamiento byte-idéntico** en `CurrencyFormatter`: `euro`/`euroWithCents`/`percent` conservan
  exactamente las mismas opciones de `toLocaleString`/`toFixed` y el método privado `safe` replica
  `Number.isFinite(value) ? value : 0` del original.
- **`MonthFactory.create`** es idéntico a `createMonth` (mismos defaults, mismo `label`, mismo orden
  de campos). `IdGenerator` se inyecta por constructor y es utilidad pura (`Math.random`), sin deps de
  Next/React/Turso: la pureza del dominio se mantiene.
- **`MonthAvailability`** replica `monthKey`→`keyOf` e `isMonthAvailable`→`isAvailable` sin cambios.
- **`ContainerDI`** conserva la semántica del `container.ts` original: los campos eager
  (`assetPriceGateway`, casos de uso de refresh/history) se inicializan en el constructor, que corre
  al instanciar el singleton en tiempo de carga de módulo — mismo momento que los `const` de módulo
  originales. La memoización lazy de `database()` es idéntica (`cachedDatabase` con guard).
- **`toDatabase`** convertido a `static` en `TursoClientFactory`; ambos call-sites (`ContainerDI`,
  `TestDatabaseFactory`) actualizados.
- **Cero imports residuales**: grep confirma que no queda ninguna referencia a `@/lib/format`,
  `@/features/budget/domain/month`, `@/lib/di/container`, ni a los símbolos antiguos
  (`formatEuro`, `generateId`, `createMonth`, `getLoadPortfolio`, etc.).
- **Tests migrados sin pérdida de cobertura**: `MonthFactory.unit.test.ts` y
  `MonthAvailability.unit.test.ts` cubren todos los casos del `month.unit.test.ts` original
  (fecha/label, defaults, overrides/events, disponibilidad pasado/actual/futuro, monotonía de
  `keyOf`), reparticionados por clase, con `describe("ClassName")`/`it("should ...")`, más tests
  nuevos de `createCurrent`.
- **Patrón class+singleton** coherente con el precedente del repo (`portfolioCalculator`,
  `monthlyBudgetCalculator`). `new` solo aparece en la definición de singletons y en el composition root.
- **Verificación**: `tsc --noEmit` limpio (0 errores); suite de `MonthFactory`/`MonthAvailability`/
  `BudgetTab` en verde (14 passed).
