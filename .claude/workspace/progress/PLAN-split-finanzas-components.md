# Plan: Dividir `src/app/page.tsx` en módulos, componentes y dominio

## Goal
Romper el monolito de ~1400 líneas `src/app/page.tsx` (todo en un único archivo
`"use client"`) en una estructura por capas y por features, sin cambiar el comportamiento
observable de las 3 pestañas (Patrimonio, Presupuesto, Metas). El objetivo es legibilidad,
testabilidad de la lógica de negocio pura y preparar el terreno para cuando llegue un backend
real (Turso + precios Yahoo), aplicando de forma **pragmática** las skills del repo sin
sobre-ingeniería para un estado que hoy sigue siendo 100% en memoria.

## Affected layers
[x] domain — se extraen las funciones puras de cálculo a servicios de dominio (clases) + tipos + config de negocio
[ ] application — **NO se crea todavía** (ver "Architecture decisions"): no hay ports/use-cases porque no hay persistencia ni dependencias que inyectar
[x] infrastructure — se aísla el único seam externo, `fetchYahooPrice`, en un módulo de infraestructura (sin port formal aún)
[x] UI — cada Tab pasa a su propio feature module; `Metric` y `<style>` a componentes; `page.tsx` queda como shell (estado + navegación)

## Nota previa importante
- **No existe `CLAUDE.md`** en el repo (la tarea pedía leerlo; no está). Recomiendo crear uno
  al final que documente esta estructura y las convenciones, pero queda como recomendación, no
  como código de producción de esta tarea.
- **No hay git** inicializado. Como este refactor es puramente estructural y verificable paso a
  paso, recomiendo `git init` + commit del estado actual antes de empezar para tener red de
  seguridad (opcional pero muy aconsejable dado que no hay control de versiones).
- **Vitest no está instalado.** Los tests co-localizados que propongo requieren añadirlo
  (ver "Testing strategy"). Puede hacerse en esta tarea o en una inmediata posterior.
- Alias disponible: `@/*` → `./src/*` (usarlo en todos los imports nuevos).

## Estructura de carpetas propuesta

```
src/
├── domain/
│   ├── types.ts                          # modelo de dominio compartido (Posicion, Deuda, Mes, ...)
│   ├── config.ts                         # reglas/constantes de negocio (OBJETIVOS, FASES, CATEGORIAS, COMPOSICION, OBJETIVO_*)
│   ├── CarteraCalculator.ts              # ← derivarCartera  (+ tipos PosicionConValor, CarteraDerivada)
│   ├── CarteraCalculator.unit.test.ts
│   ├── PresupuestoMensualCalculator.ts   # ← calcMes (+ tipo CalculoMes)
│   ├── PresupuestoMensualCalculator.unit.test.ts
│   ├── ProyeccionFinancieraCalculator.ts # ← proyectarFI (+ tipos ProyeccionFIParams/Resultado)
│   ├── ProyeccionFinancieraCalculator.unit.test.ts
│   └── presupuesto/
│       ├── mes.ts                        # crearMes (factory), claveMes, esMesDisponible
│       └── mes.unit.test.ts
├── infrastructure/
│   └── precios.ts                        # ← fetchYahooPrice (único seam externo)
├── data/
│   └── initial-state.ts                  # seed en memoria: CARTERA_INICIAL, DEUDAS_INICIAL, HISTORICO_INICIAL, PRESUPUESTO_BASE_INICIAL, GASTOS_FIJOS_INICIAL, MESES_INICIAL
├── lib/
│   ├── theme.ts                          # ← C (paleta) → `palette` + SERIES → `chartSeriesColors` + colorDe → `seriesColorAt`
│   └── format.ts                         # ← eur/eur2/pct/uid → formatEuro/formatEuroWithCents/formatPercent/generateId
├── components/
│   └── Metric.tsx                        # ← componente Metric + MetricProps
├── features/
│   ├── patrimonio/PatrimonioTab.tsx      # ← PatrimonioTab + tipos/consts locales
│   ├── presupuesto/PresupuestoTab.tsx    # ← PresupuestoTab + tipos/consts locales
│   └── metas/MetasTab.tsx                # ← MetasTab + tipos/consts locales
└── app/
    ├── page.tsx                          # SHELL: estado useState + navegación por tabs
    └── AppStyles.tsx                     # ← el bloque <style> (CSS-in-JS + @import fuentes)
```

Justificación de por qué SÍ creo `domain/` pero NO `application/ports`, `infrastructure/db`,
`lib/di`: la skill hexagonal dice "empieza simple y crece; no montes capas vacías". `domain/`
**no está vacío** — contiene lógica de negocio pura real (los 3 calculadores + config + tipos),
que es exactamente el centro de la arquitectura. En cambio ports/use-cases/DI/Turso serían
carpetas especulativas hoy (no hay nada que persistir ni inyectar), así que se difieren.

## Files to create/modify

Crear:
- `src/lib/theme.ts` — `palette` (antes `C`), `chartSeriesColors` (antes `SERIES`), `seriesColorAt(index)` (antes `colorDe`).
- `src/lib/format.ts` — `formatEuro`, `formatEuroWithCents`, `formatPercent`, `generateId`.
- `src/domain/types.ts` — interfaces del modelo: `TipoPosicion`, `GrupoPosicion`, `Posicion`, `PuntoHistorico`, `Deuda`, `CategoriaId`, `TipoCategoria`, `Categoria`, `GastoFijoItem`, `CategoriaEvento`, `Evento`, `Mes`, `PresupuestoBase`, `PresupuestoBaseBorrador`, `Fase`, `CondicionesBTC`, `CompItem`, `Composicion`.
- `src/domain/config.ts` — `OBJETIVOS`, `FASES`, `CATEGORIAS`, `CATEGORIA_LABEL`, `COMPOSICION`, `OBJETIVO_FI`, `OBJETIVO_VIVIENDA`, `OBJETIVO_BTC_OP`.
- `src/domain/CarteraCalculator.ts` — clase con método `derivar(cartera): CarteraDerivada`; co-localiza `PosicionConValor` y `CarteraDerivada`.
- `src/domain/PresupuestoMensualCalculator.ts` — clase con método `calcular(mes, base): CalculoMes`; co-localiza `CalculoMes`.
- `src/domain/ProyeccionFinancieraCalculator.ts` — clase con método `proyectar(params): ProyeccionFIResultado`; co-localiza `ProyeccionFIParams`, `ProyeccionFIResultado`.
- `src/domain/presupuesto/mes.ts` — `crearMes(anio, mesIndex, overrides?, eventos?)`, `claveMes(fecha)`, `esMesDisponible(fecha)`.
- `src/infrastructure/precios.ts` — `fetchYahooPrice(ticker)` (mantiene el placeholder que lanza error).
- `src/data/initial-state.ts` — todas las constantes `*_INICIAL`.
- `src/components/Metric.tsx` — `Metric` + `MetricProps`.
- `src/features/patrimonio/PatrimonioTab.tsx` — `PatrimonioTab`, `PatrimonioTabProps`, tipos/consts locales (`CampoPosicionEditable`, `TabId`/`VistaComposicion` usados aquí, `Alerta`, `TIPO_LABEL`, `tiposDisponibles`, `filasRV`).
- `src/features/presupuesto/PresupuestoTab.tsx` — `PresupuestoTab`, `PresupuestoTabProps`, `BorradorDesglose`, `CampoPresupuestoBaseEditable`, `CampoGastoFijoEditable`.
- `src/features/metas/MetasTab.tsx` — `MetasTab`, `MetasTabProps`, `CampoDeudaEditable`.
- `src/app/AppStyles.tsx` — componente que devuelve el `<style>` (importa `palette`).
- Tests unitarios co-localizados (ver Testing strategy).

Modificar:
- `src/app/page.tsx` — reducido a `FinanzasApp`: los `useState`, `TABS`, el `<header>`, el
  render condicional de los 3 tabs, `<AppStyles/>` y `<footer>`. Instancia los calculadores
  para `derivada` (ver flujo de props/estado). Todo lo demás sale a los módulos anteriores.

## Implementation steps
Orden por dependencias (hojas primero). **Ejecutar `next dev` y comprobar que las 3 pestañas
renderizan y sus flujos de edición funcionan tras CADA paso**; `tsc`/eslint deben pasar limpios.

1. (Prereq recomendado) `git init` + commit del estado actual como baseline.
2. `src/lib/theme.ts`: mover paleta y renombrar `C→palette`, `SERIES→chartSeriesColors`,
   `colorDe→seriesColorAt`. Reemplazar en `page.tsx` (aún monolítico) todas las refs
   `C.` → `palette.` e importar. Verificar (el diff es grande pero mecánico; `tsc` caza fallos).
3. `src/lib/format.ts`: mover y renombrar `eur→formatEuro`, `eur2→formatEuroWithCents`,
   `pct→formatPercent`, `uid→generateId`. Reemplazar usos en `page.tsx`. Verificar.
4. `src/domain/types.ts`: mover interfaces del modelo (solo tipos, cero riesgo runtime). Importar. Verificar `tsc`.
5. `src/domain/config.ts`: mover constantes de negocio. Verificar.
6. `src/domain/CarteraCalculator.ts`: convertir `derivarCartera` en clase; mover `PosicionConValor`/`CarteraDerivada`. Verificar. (Test en paso 15.)
7. `src/domain/presupuesto/mes.ts`: mover `crearMes`/`claveMes`/`esMesDisponible`. Verificar.
8. `src/domain/PresupuestoMensualCalculator.ts`: convertir `calcMes` en clase; mover `CalculoMes`. Verificar.
9. `src/domain/ProyeccionFinancieraCalculator.ts`: convertir `proyectarFI` en clase; mover tipos de proyección. Verificar.
10. `src/data/initial-state.ts`: mover seeds (dependen de tipos + `crearMes` + `generateId`). Verificar.
11. `src/infrastructure/precios.ts`: mover `fetchYahooPrice`. Verificar (botón "Actualizar precios" sigue mostrando el alert de CORS).
12. `src/components/Metric.tsx`: mover `Metric`. Verificar.
13. `src/app/AppStyles.tsx`: extraer el `<style>`; `page.tsx` lo renderiza como `<AppStyles/>`. Verificar estilos intactos.
14. Mover cada Tab a su feature module (uno a uno, verificando la pestaña correspondiente):
    `PatrimonioTab` → `PresupuestoTab` → `MetasTab`. Cada uno importa lo que necesita de
    `@/domain`, `@/lib`, `@/components`. Ajustar `page.tsx` para importarlos.
15. `page.tsx` queda como shell. Verificación final completa: cambiar entre las 3 pestañas,
    editar cartera, editar presupuesto base (guardar/cancelar), cargar mes, guardar desglose,
    añadir/borrar evento, editar deudas, sliders de FI/BTC, checkbox coche.
16. (Testing) Instalar Vitest + añadir los `*.unit.test.ts` de dominio y ejecutarlos.
17. (Opcional) Crear `CLAUDE.md` documentando la estructura resultante.

## Flujo de props/estado
- **Todo el estado sigue en `FinanzasApp` (page.tsx)** con `useState`, sin cambios: `cartera`,
  `historico`, `deudas`, `presupuestoBase`, `meses`, `gastosFijosItems`, `salarioActual`,
  `aportacionFI`, `rentabilidadFI`, `huchaBTC`, `condicionesBTC`, `contarCoche`, `tab`.
- `derivada` se calcula en `page.tsx` con `useMemo(() => carteraCalculator.derivar(cartera), [cartera])`
  y se pasa como prop a `PatrimonioTab` y `MetasTab` (igual que hoy).
- Los `PresupuestoMensualCalculator` y `ProyeccionFinancieraCalculator` los usan directamente
  `PresupuestoTab` y `MetasTab` respectivamente dentro de sus `useMemo` (misma lógica, ahora
  importada). Las interfaces `*TabProps` se mantienen idénticas (mismos `set*` de React).
- **Instanciación de los calculadores**: como no tienen dependencias ni estado, se exporta una
  instancia singleton a nivel de módulo desde cada archivo de dominio
  (`export const carteraCalculator = new CarteraCalculator()`), y los consumidores la importan.
  Cuando aparezcan dependencias (p. ej. un `PriceGateway`), la construcción se moverá a un
  composition root — se documenta esa evolución, no se adelanta hoy.

## Testing strategy
Prerequisito: añadir Vitest (`vitest`), `@vitest/*` y, para tests de componentes futuros,
`@testing-library/react` + `jsdom`. Config `vitest.config.ts` con alias `@/` y entorno `node`
para dominio (jsdom solo cuando haya tests de componentes).

- **Unit (dominio puro, sin mocks — la skill dice: dominio real, se instancia)**:
  - `CarteraCalculator.unit.test.ts`: valoración de efectivo (participaciones = saldo), valoración
    de posiciones (participaciones × precio), `total`/`invertido`/`liquidezTotal`/`rv`/`btcTotal`,
    `btcPesoTotal`, `pesoRVde(id)`, y que `pieCartera` excluye posiciones con valor 0. Valores
    esperados derivados de los inputs construidos (sin datos mágicos inline).
  - `PresupuestoMensualCalculator.unit.test.ts`: override de categoría vs base, suma de eventos por
    categoría, `ingresoNetoOverride` + eventos de tipo "ingreso", `sobrante`, y `totalReal` usando
    `real` cuando existe y cayendo a `valores` cuando es `null`.
  - `ProyeccionFinancieraCalculator.unit.test.ts`: alcanza el objetivo en N meses con capitalización
    mensual; devuelve `meses: null` cuando no se alcanza dentro de `maxMeses`; `capitalFinal` coherente.
  - `presupuesto/mes.unit.test.ts`: `esMesDisponible` (mes pasado/actual true, futuro false) y
    `claveMes` monótona; `crearMes` produce la etiqueta y fecha esperadas.
- **Menor prioridad**: `format.unit.test.ts` (ojo: `toLocaleString` depende de locale del runner;
  o se fija locale o se testea solo `formatPercent`/`generateId`). No bloqueante.
- **Diferido (no en esta tarea)**: tests de componente de los Tabs con React Testing Library
  (consultas por rol semántico) y mock de `fetchYahooPrice` en el borde. Son pesados por recharts;
  se hacen cuando la UI se estabilice.
- **No aplica**: tests de integración Turso (no hay repos ni base de datos todavía).

## Architecture decisions

1. **Cuánta hexagonal aplicar ahora (evitar sobre-ingeniería)**: se crea únicamente la capa
   `domain/` (poblada con lógica real) + un módulo `infrastructure/precios.ts` para el único seam
   externo. NO se crean `application/use-cases`, `ports/{driving,driven}`, `infrastructure/db`
   ni `lib/di`, porque hoy no hay persistencia, ni dependencias que inyectar, ni segundo
   implementador/mocking que justifique un port (la propia skill class-first lo dice
   explícitamente: "una feature de un solo archivo no necesita un port todavía"). Se documenta la
   ruta de evolución: cuando llegue Turso/precios reales, `fetchYahooPrice` se convierte en un
   driven port `PriceGateway` con adapter en `infrastructure/`, la orquestación de "actualizar
   precios" pasa a un use-case en `application/`, y la construcción se centraliza en un
   composition root en `lib/di/`.

2. **Funciones puras → clases (class-first)**: `derivarCartera`, `calcMes` y `proyectarFI` son
   lógica de negocio central y compartida entre archivos + tests, así que se convierten en clases
   con un método de intención clara (`derivar`, `calcular`, `proyectar`) siguiendo la skill
   class-first ("named classes over loose utility functions" para core behavior). Se reconoce el
   contra-argumento (son puras y sin estado, por lo que funciones también serían defendibles por
   KISS): se elige clases para alinear con la convención documentada del repo y facilitar la
   futura inyección; son triviales de revertir. Los helpers de formato (`formatEuro`, etc.) y de
   fecha (`claveMes`, `esMesDisponible`) se quedan como **funciones de módulo con nombre semántico**,
   no clases: son helpers de presentación/utilidad, no comportamiento de negocio central, y una
   clase ahí sería sobre-ingeniería (la skill lo permite: "tiny pure helpers"). `crearMes` es una
   factory; se deja como función `crearMes` (podría ser `MesFactory.crear` en el futuro).

3. **Limpieza de nombres (code-semantic) — qué SÍ y qué NO en esta tarea**:
   - **SÍ** se renombra la **API pública que ahora cruza fronteras de módulo**, porque exportar
     `C`, `eur`, `pct`, `uid`, `colorDe` desde módulos recién creados sería exactamente el
     anti-patrón que code-semantic ataca, y el coste es mecánico (una definición, N llamadas que
     `tsc` valida): `C→palette`, `SERIES→chartSeriesColors`, `colorDe→seriesColorAt`,
     `eur→formatEuro`, `eur2→formatEuroWithCents`, `pct→formatPercent`, `uid→generateId`,
     `derivarCartera/calcMes/proyectarFI→` métodos de clase.
   - **SÍ** se limpian los parámetros crípticos **dentro de los calculadores extraídos** (los
     `s`, `p`, `i`, `c`, `e` de los `reduce`/`map` de `derivarCartera`/`calcMes`), porque son el
     núcleo testeado, pequeño y se está reescribiendo de todas formas.
   - **NO** (se difiere a una tarea posterior "limpieza semántica de internals de los Tabs") la
     limpieza exhaustiva de los cientos de contadores de una letra dentro del JSX de los tres Tab
     components (`.map(e => ...)`, `d` de deuda, `m` de mes, `k`, `f`...). Motivo: hacerlo a la vez
     que el split estructural infla el diff, lo vuelve irrevisable y multiplica el riesgo de romper
     una pestaña. Separar "mover" de "renombrar-todo" mantiene cada paso verificable. Se registra
     como deuda técnica explícita.

4. **CSS-in-JS**: el `<style>` se extrae tal cual a `AppStyles.tsx` (sin migrar a CSS modules ni
   variables CSS, y sin tocar el `@import` de Google Fonts). La migración a CSS variables/`next/font`
   (mejor rendimiento, elimina el `@import` bloqueante) se difiere: aquí solo movemos, no
   rediseñamos el sistema de estilos.

5. **Co-localización de tipos**: en vez de un `src/types/` "cajón de sastre", el modelo de dominio
   compartido va a `src/domain/types.ts`, los tipos derivados (`CarteraDerivada`, `CalculoMes`,
   proyección) se co-localizan con el calculador que los produce, y los `*TabProps`/tipos de UI con
   su componente. Mayor cohesión, alineado con code-semantic.

## Risks and dependencies
- **Sin git y sin tests hoy** → la única red de seguridad es `next dev` + `tsc`. De ahí el orden
  hoja-a-hoja con verificación tras cada paso y la recomendación de `git init` primero.
- **Renombrado global de `C→palette`** (paso 2): es el cambio con más puntos de contacto (cientos
  de `C.xxx` en JSX). Se hace mientras el archivo aún es monolítico (find/replace único) y `tsc`
  atrapa cualquier referencia perdida. Hacerlo en su propio paso aislado, no mezclado con mover
  componentes.
- **`react-strict` / React Compiler**: se conservan los `useMemo` existentes tal cual; NO se
  eliminan en esta tarea aunque la skill lo sugiera (riesgo innecesario en un refactor estructural).
- **Estado local con derivación en render** en `PresupuestoTab` (el patrón `mesIdSincronizado` /
  `setBorrador` durante render): mover el componente completo intacto lo preserva; cuidado de no
  "arreglarlo" al vuelo — es lógica sutil que debe copiarse verbatim.
- **`fetchYahooPrice`** sigue lanzando error a propósito; el comportamiento esperado tras mover es
  idéntico (alert de CORS). No conectar backend en esta tarea.
- **Orden estricto**: tipos y config antes que calculadores; calculadores y `crearMes`/`generateId`
  antes que `initial-state`; todo lo anterior antes de mover los Tabs; los Tabs antes de vaciar
  `page.tsx`.
- **Vitest**: si se decide no instalarlo en esta tarea, los pasos 16 y los `*.unit.test.ts` se
  mueven a una tarea inmediata siguiente; el split no depende de ellos para funcionar.
