# Review: Objetivos de patrimonio editables y persistidos por usuario (`WealthTargets`)

## Verdict: PASS

Réplica limpia del vertical slice de `goals_settings`. Los 10 criterios críticos se cumplen.
`tsc --noEmit` limpio; los 8 suites relevantes en verde (34/34): use cases, mapper, integración
Turso con aislamiento, componentes (`WealthTab`, `WealthTargetsOnboarding`, `GoalsTab`) y
`LoadInitialAppState`. No queda ningún residuo de `TARGETS.` ni de los nombres de campo antiguos.

## Blocking findings
- Ninguno.

## Warnings (non-blocking) — RESUELTOS 2026-07-12
- `src/features/goals/components/GoalsTab.tsx:225` — **Fijado.** La etiqueta del checkbox ahora
  interpola `currencyFormatter.euro(effectiveWealthTargets.minimumFund)` en vez del literal
  `1.000€`.
- `src/features/wealth/components/WealthTab.tsx:81-84,425` — **Fijado.** Los mensajes de alerta BTC
  y la nota de "Reglas BTC" ahora interpolan `targets.btcSellWeight`/`targets.btcPauseWeight`/
  `currencyFormatter.euro(targets.btc{Sell,Pause}Capital)` (mensajes de alerta) y
  `wealthTargets.btc{Pause,Sell}Weight`/`wealthTargets.btc{Pause,Sell}Capital/1000` + "k" (nota de
  reglas), en vez de los literales `50/40/10k/20k`. El "hasta el 30%" de venta parcial se deja
  hardcodeado deliberadamente: no es un campo de `WealthTargets` (tampoco lo era en el `TARGETS`
  original) — es una recomendación de acción fija, no una preferencia editable.

## Positive points
- **IDOR cerrado**: `saveWealthTargets.ts` resuelve el `userId` en servidor vía
  `currentUserProvider.requireUserId()` y nunca lo acepta del cliente; el `userId` viaja por
  `invoke(userId, targets)`, manteniendo el use case como singleton. Idéntico al patrón de
  `saveGoalsSettings`.
- **Aislamiento real por usuario**: `TursoWealthTargetsRepository.find/save` acotan por
  `wealthTargets.userId` (PK) con `onConflictDoUpdate` idempotente. El test de integración cubre
  `null` sin sembrar, round-trip, overwrite en el segundo save y el caso explícito `user-1` vs
  `user-2` sin fuga.
- **Migración generada, no escrita a mano**: `drizzle/0001_fair_human_fly.sql` + `meta/0001_snapshot`
  + `_journal` (idx 1) provienen de `db:generate`. Tabla aditiva `wealth_targets`, `user_id` PK con
  `FOREIGN KEY … REFERENCES user(id) ON DELETE cascade`, columnas `real NOT NULL` coherentes con
  `goals_settings`/`budget_base`.
- **Renombrado semántico completo**: `grep "TARGETS\." src` = 0; no queda `btcPause`/`btcSell`/
  `btcPauseThreshold`/`btcSellThreshold` sueltos. `WealthTargets` con `btcPauseWeight/btcSellWeight/
  btcPauseCapital/btcSellCapital` y `equityTargets` anidado, aplanado solo en el row mapper (paralelo
  a `btcConditions`).
- **DRY resuelto en ambos sitios**: los dos hardcodes `60/20/20` de `WealthTab` — el cálculo de
  `score` (ahora línea 97, `targets.equityTargets.*`) y `equityRows` (líneas 184-188,
  `wealthTargets.equityTargets.*`) — están ambos ruteados por los objetivos. Ya no hay `60/20/20`
  literal en el componente.
- **UX de degradación correcta**: con `wealthTargets == null`, `WealthTab` renderiza el onboarding
  como card `span-full` y degrada a empty-state solo las 4 cards dependientes (Nota, Estado del plan,
  Renta variable, Fondo de emergencia); total, distribución, histórico y composición siguen pintando
  con datos reales. Cubierto por el test "should degrade the plan cards to an empty state".
- **GoalsTab de solo lectura**: recibe `wealthTargets` como prop read-only, sin editor ni onboarding
  propios; cae a `WEALTH_TARGETS_INITIAL` (`wealthTargets ?? WEALTH_TARGETS_INITIAL`) y el antiguo
  `4.900€` ahora interpola `effectiveWealthTargets.emergencyFund`. Dos tests cubren fallback y valor
  configurado.
- **Class-first / code-semantic**: use cases con `invoke()`, repo y mapper como clases, puerto
  `WealthTargetsRepository` en el límite. Las únicas funciones exportadas son la Server Action y los
  componentes React (patrones obligados por Next). `new` solo en el composition root (`ContainerDI`) y
  en los tests. Sin comentarios explicativos.
- **Ubicación en `domain/`** (desviación documentada): un DTO de dominio puro sin dependencias de
  framework es hexagonalmente válido (application → domain es hacia dentro); verificado que
  `WealthTargets.ts` no tiene imports y `data/wealthTargets.ts` solo importa el tipo. Coherente con
  que `TARGETS` ya vivía en `wealth/domain/config.ts`. Desviación razonable, no oculta problema.
- **Cobertura completa**: unit de ambos use cases + mapper, integración con aislamiento, componente
  para onboarding/empty-state en `WealthTab`, fallback en `GoalsTab`, onboarding sin persistencia, y
  e2e `wealth.e2e.spec.ts` que edita el fondo de emergencia, espera el debounce y verifica la
  persistencia tras recarga. El seed e2e (`prepare-database.mjs`) inserta la fila `wealth_targets`.
- **`config.ts` intacto en lo demás**: `COMPOSITIONS` (dato de mercado, no personal) se conserva tal
  cual, como pedía el alcance.
