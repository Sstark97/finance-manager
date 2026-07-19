# Review: Extracción de WealthEvolutionChart (compartido entre Patrimonio y Dashboard)

## Verdict: PASS

## Blocking findings
- Ninguno.

## Warnings (non-blocking)
- `src/features/wealth/components/WealthEvolutionChart.unit.test.tsx:23` — El `beforeEach` hace `vi.stubGlobal("fetch", ...)` pero no hay `afterEach` con `vi.unstubAllGlobals()`. Vitest aísla por fichero por defecto, así que no hay fuga real entre suites, pero conviene restaurar globals explícitamente para no depender de esa configuración.
- `src/features/wealth/components/WealthEvolutionChart.tsx:38-40` — Reportar `{ change, changePercent }` al padre vía `useEffect` es aceptable aquí (los valores dependen de `total`/`liquidityTotal` que pueden cambiar sin re-fetch, así que el efecto los re-emite correctamente), pero es un patrón "efecto que sincroniza hacia el padre". No es el antipatrón de guardar estado derivado en `useState` (change/changePercent se calculan en render, líneas 35-36). Se deja como observación, no bloqueante.
- `src/features/wealth/components/WealthEvolutionChart.tsx:60` — `catch {` sin binding. Coherente con el código original y con el resto de `WealthTab` (`refreshPrices`), pero la convención `code-semantic` pide `catch (error)`. Pre-existente y consistente; no bloqueante.

## Verificación de los puntos de atención

1. **Estabilidad del setter de `useState` (`setEvolutionSummary` como `onSummaryChange` sin `useCallback`)** — Correcto. React garantiza que los setters de `useState` son referencialmente estables. El `useEffect` que dispara el fetch (`WealthEvolutionChart.tsx:65-68`) depende de `[historyRange, loadHistory]`, NO de `onSummaryChange`; `loadHistory` es un `useCallback` con deps `[]` (usa `portfolioRef`). Por tanto `onSummaryChange` no participa en ningún array de deps que provoque re-fetch. El efecto de reporte (`:38-40`) depende de `[change, changePercent, onSummaryChange]`: como los tres son estables entre renders una vez asentado (change/changePercent son primitivos derivados de props que no cambian al hacer el padre `setEvolutionSummary`), no hay bucle de render. Se produce como mucho un render extra al asentarse, no un loop.

2. **Comportamiento de `WealthTab` idéntico** — Preservado. La tarjeta hero (`WealthTab.tsx:196`) sigue mostrando `change`/`changePercent`, ahora tomados de `evolutionSummary` (`:56`). El valor inicial `{ change: 0, changePercent: 0 }` coincide con el cálculo antiguo cuando `history` estaba vacío (`firstHistoryTotal = total` → `change = 0`). Al cambiar el rango dentro de `WealthEvolutionChart`, se re-hace el fetch → `setHistory` → recálculo de change/changePercent → efecto → `onSummaryChange` → `setEvolutionSummary` → el hero se actualiza. Cadena correcta. Hay un render de latencia (child→efecto→padre) frente al cálculo síncrono anterior, pero el resultado visible es idéntico tras asentarse.

3. **Sin código muerto en `WealthTab`** — Confirmado. Eliminados `history`/`historyRange`/`loadingHistory`/`historyWarning`, `firstHistoryTotal`, y los imports `LineChart`/`Line`/`ReferenceLine` de recharts y los tipos `PortfolioHistoryPoint`/`HistoryRange`/`PortfolioHistoryResult`. Los imports recharts restantes (`PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer`) siguen todos en uso. `portfolioRef`, `useRef`, `useEffect`, `useCallback` siguen usándose para `refreshPrices`/polling de precios (`:120-147`), no son residuos.

4. **`DashboardTab` sin fetch duplicado** — Una única instancia de `<WealthEvolutionChart>` (`DashboardTab.tsx:61`), sin callback. Un solo fetch al montar (ytd) más re-fetch al cambiar de rango. El stub de `fetch` con `{ ok: false }` en el test no oculta duplicación: no hay segunda instancia montada en la app real.

5. **class-first / code-semantic** — Conforme. Componente de función coherente con la convención de `features/wealth/components/` (WealthTab, WealthTargetsOnboarding también son componentes de función; class-first aplica a servicios/mappers/casos de uso, no a componentes React). Nombres semánticos, sin comentarios, return type explícito `React.JSX.Element`, uso de `??` en `history[0]?.total ?? total`. Sin `any`. Sin cadenas que violen la Ley de Demeter.

6. **Tests de comportamiento** — Sólidos. Verifican fetch en mount con rango `ytd`, re-fetch al cambiar de rango (`1w`), warning por tickers fallidos, warning por backend caído, e invocación de `onSummaryChange` con valores derivados de las entradas (no datos mágicos: `expectedChange = 500 - 400`, `expectedChangePercent = (100 / (400 - 100)) * 100`). Mock solo en el boundary de `fetch`. Naming `describe("WealthEvolutionChart")` + `it("should ...")` correcto. 20/20 tests pasan en los dos ficheros afectados.

## Positive points
- Extracción limpia y fiel: el JSX, el estado, el fetch y el cálculo se movieron sin alterar la lógica, y se eliminó todo el código muerto asociado en `WealthTab`.
- La dependencia cruzada (hero de `WealthTab` alimentado por el mismo estado del gráfico) se resolvió sin duplicar el fetch, con una única fuente de verdad en el hijo y reporte hacia arriba vía callback opcional.
- Reutilización correcta en Dashboard sin el callback, aprovechando que `onSummaryChange` es opcional y está guardado con `?.`.
- Cobertura de tests que ejercita comportamiento real (rango correcto en el body, warnings, cálculo del summary), no solo presencia de elementos.
