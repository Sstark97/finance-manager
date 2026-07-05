# Review: Split de `src/app/page.tsx` en módulos por capas

## Verdict: PASS

Refactor puramente estructural. Comparé cada calculador extraído y cada seed contra el
monolito original (`git show 026ee5f:src/app/page.tsx`): la lógica se preservó verbatim,
solo renombrando identificadores. La estructura de carpetas respeta los límites de capa del
plan. Todos los ítems bloqueantes del checklist se cumplen.

## Blocking findings
- Ninguno.

## Warnings (non-blocking)
- `src/lib/format.ts:1,4` — `formatEuro`/`formatEuroWithCents` cambian el guard original
  `(n || 0)` por `(amount ?? 0)`. Alineado con el estándar (`??` sobre `||`), pero introduce
  una diferencia de comportamiento en el caso `NaN`: el antiguo `eur(NaN)` renderizaba
  `"0 €"` y el nuevo `formatEuro(NaN)` renderiza `"NaN €"`. Los calculadores blindan sus
  salidas con `|| 0`, así que `derivada`/`calculo` no producen `NaN`; el riesgo se limita a
  campos crudos que se pasen sin sanear a los formatters. Verificar que ningún input de
  edición (parseFloat de un campo vacío) llegue a `formatEuro` sin guard.
- `src/domain/CarteraCalculator.ts:1,26` — el servicio de dominio importa `seriesColorAt`
  de `@/lib/theme` y asigna un `color` de presentación dentro de `derivar`. `lib/theme` es
  puro (sin deps de framework), así que no rompe la regla "domain sin React/Next/Turso", pero
  es una fuga de una preocupación de presentación al dominio. Es un movimiento fiel al original
  (`derivarCartera` ya llamaba a `colorDe`); considerar mover la asignación de color a la capa
  UI en una tarea futura.
- `src/features/patrimonio/PatrimonioTab.tsx:13` — un Client Component importa
  `@/infrastructure/precios` directamente (`fetchYahooPrice`), lo que roza la regla hexagonal
  5 ("los Client Components nunca tocan infrastructure"). Es deuda documentada y diferida en el
  plan (sin persistencia real no se crea el port `PriceGateway` ni el use-case). Aceptable en
  este alcance; queda como el siguiente seam a formalizar cuando llegue el backend.
- `src/domain/CarteraCalculator.ts:28-29`, `src/domain/PresupuestoMensualCalculator.ts:18-25`
  — los guards internos `|| 0` / `|| []` se conservan verbatim mientras los formatters se
  pasaron a `??`. Inconsistencia menor; funcionalmente idénticos aquí (`participaciones` y
  `importe` son `number`, y `0 || 0 === 0 ?? 0`), y el plan pide preservar los internals de
  los calculadores tal cual. Sin acción requerida.
- `src/domain/presupuesto/mes.unit.test.ts:4,24` — usa `describe("esMesDisponible")` /
  `describe("claveMes")` (nombres de función) en vez de `describe("ClassName")`. Coherente
  con la decisión del plan de dejar estos helpers como funciones de módulo, no clases; los
  nombres siguen siendo descriptivos. Sin acción.

## Positive points
- **Correctness del movimiento**: los tres calculadores (`derivar`/`calcular`/`proyectar`) son
  la lógica de `derivarCartera`/`calcMes`/`proyectarFI` línea por línea, solo con variables
  renombradas a nombres semánticos (`s→sum`, `p→posicion`, `i→posicionIndex`, `e→evento`,
  `c→categoria`). Los seeds `*_INICIAL` y `crearMes` (antes `nuevoMes`) son idénticos.
- **Domain puro**: cero imports de React/Next/libSQL/Drizzle en `src/domain/` (verificado por
  grep). Solo depende de `@/domain/*` y helpers puros de `@/lib/*`.
- **Sin imports rotos ni ciclos**: todos los imports usan el alias `@/` (ningún `../` relativo).
  Grafo de dependencias acíclico (domain→lib, config→types, data→domain/lib, features→domain/
  lib/components/infra, app→todo).
- **Singletons correctos**: `carteraCalculator`, `presupuestoMensualCalculator` y
  `proyeccionFinancieraCalculator` se exportan como instancia única a nivel de módulo y se
  consumen sin re-instanciar; `new` solo aparece en el singleton y en los tests. Son
  stateless, así que no hay fuga de estado compartido entre renders.
- **Patrón sensible preservado**: la derivación en render de `PresupuestoTab`
  (`mesIdSincronizado` + `setBorrador` durante el render, `PresupuestoTab.tsx:93-99`) se copió
  verbatim, sin "arreglarlo" al vuelo. No se introdujo ningún `useEffect` para estado derivado.
- **Return types explícitos** en todas las funciones públicas nuevas; **cero `any`** en todo
  `src/` (verificado por grep).
- **Tests significativos**, no tautológicos: derivan los valores esperados de los inputs
  construidos (sin datos mágicos inline) y cubren bordes reales — `pesoRVde` con id inexistente
  (→0), exclusión de posiciones con `valor` 0 de `pieCartera`, fallback de `totalReal` a
  presupuestado cuando `real` es `null`, `meses: null` cuando el objetivo es inalcanzable, y
  coherencia de `capitalFinal`. Convención `describe`/`it("should …")` respetada, sin mocks
  (dominio real, como manda la skill).
