# Plan: Inicializar Next.js (App Router + TS) y portar PortfolioDashboard.jsx a app/page.tsx

## Goal
Arrancar el proyecto Next.js (aún inexistente) con App Router y TypeScript, convertir
`PortfolioDashboard.jsx` (1179 líneas, app completa de finanzas en un solo archivo) a TSX
tipado sin cambiar su lógica, y colocarlo como página principal. Explícitamente **no** se
divide en componentes ni se introduce dominio/aplicación/infraestructura todavía; eso queda
para tareas futuras. El resultado debe compilar en modo `strict` y renderizar las 3 pestañas
(Patrimonio, Presupuesto, Metas) en `next dev`.

## Affected layers
[ ] domain  [ ] application  [ ] infrastructure  [x] UI

Solo se toca la capa UI. Ninguna entidad de dominio, use case, puerto ni repositorio se crea
en este paso (ver "Architecture decisions" para el porqué).

## Files to create/modify

Scaffolding generado por `create-next-app` (App Router + `--src-dir`):
- `package.json` — dependencias Next/React/TS + `recharts`.
- `tsconfig.json` — `strict: true`, alias `@/*` -> `src/*`.
- `next.config.ts` — config por defecto (Turbopack es el bundler por defecto en Next 16).
- `next-env.d.ts`, `eslint.config.mjs`, `.gitignore` — generados.
- `src/app/layout.tsx` — layout raíz generado (se conserva; `<html lang="es">`).
- `src/app/globals.css` — se conserva vacío/mínimo (los estilos viven inline en la página).
- `public/*` — assets por defecto.

Archivos objeto de esta tarea:
- `src/app/page.tsx` — **crear**: contenido portado de `PortfolioDashboard.jsx` a TSX, con
  `"use client"` en la primera línea. Es un archivo grande a propósito (aceptado por el alcance).
- `PortfolioDashboard.jsx` (raíz) — **eliminar** una vez portado y verificado. Es el origen; ya
  no debe quedar como código muerto en la raíz.

Decisión sobre tipos: para este paso **los `interface`/`type` viven dentro de `src/app/page.tsx`**
(mismo archivo). No se crea `src/types/` todavía (YAGNI): nada externo consume aún esos tipos y
el usuario pidió no fragmentar. Cuando se dividan componentes en la tarea siguiente, los tipos
compartidos se extraerán a `src/types/` o al feature module correspondiente.

## Estructura de carpetas resultante
Se usa `--src-dir` para que el layout futuro de `hexagonal-architecture` (`src/domain`,
`src/application`, `src/infrastructure`, `src/features`, `src/store`, `src/lib/di`) encaje junto
a `src/app` sin reorganizar después.

```
finance-manager/
├── .claude/                      (ya existe, intacto)
├── public/
├── src/
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx              <- código portado (client component)
│       └── globals.css
├── next.config.ts
├── tsconfig.json
├── package.json
├── eslint.config.mjs
├── next-env.d.ts
└── .gitignore
```

## Implementation steps

1. **Scaffold en carpeta temporal y mover** (el directorio raíz no está vacío: contiene
   `.claude/`, `PortfolioDashboard.jsx` y `skills-lock.json`; `create-next-app .` aborta ante
   `.claude/`, que no está en su lista de archivos "seguros"). Por tanto:
   - Ejecutar en un directorio temporal hermano:
     ```
     npx create-next-app@latest fm-scaffold \
       --ts --app --src-dir --eslint --no-tailwind \
       --import-alias "@/*" --no-git --turbopack --use-npm
     ```
   - Copiar el contenido generado (incluidos `package.json`, `tsconfig.json`, `next.config.ts`,
     `src/`, `public/`, `next-env.d.ts`, `eslint.config.mjs`, `.gitignore`) a la raíz del repo,
     **sin** pisar `.claude/`, `PortfolioDashboard.jsx` ni `skills-lock.json`.
   - Verificar que `src/app/layout.tsx` y `src/app/page.tsx` (demo) existen antes de continuar.

2. **Instalar recharts** en la raíz: `npm install recharts`. Recharts trae sus propios tipos
   (no hace falta `@types/recharts`). Confirmar en `package.json` que la versión resuelta es
   compatible con la versión de React que instaló Next (Next 16 => React 19; recharts >= 2.15).

3. **Portar el código a `src/app/page.tsx`** partiendo de `PortfolioDashboard.jsx`:
   - Primera línea: `"use client";` (usa `useState`/`useMemo`/`useEffect` y recharts, todo
     client-side).
   - Mantener la lógica **idéntica**; solo añadir tipos y los ajustes mínimos de TS del paso 4.
   - `export default function FinanzasApp()` sigue siendo el componente de página.

4. **Conversión JSX -> TSX: tipos e incidencias concretas de `strict`.**

   Interfaces/uniones a declarar (nombres descriptivos, en el propio archivo):
   - `type TipoPosicion = "fondo" | "etf" | "cripto" | "efectivo";`
   - `type GrupoPosicion = "rv" | "btc" | "liquidez";`
   - `interface Posicion { id; nombre; ticker; tipo: TipoPosicion; participaciones: number; precio: number; grupo: GrupoPosicion; }`
   - `interface PosicionConValor extends Posicion { color: string; valor: number; }` (salida de `derivarCartera`).
   - `interface PuntoHistorico { mes: string; total: number; }`
   - `interface Deuda { id; nombre; cuota: number; saldo: number; nota: string; limite?: string; }`
   - `type CategoriaId = "gastosFijos" | "inversion" | "fondoEmergencia" | "ocio" | "caprichos";`
   - `type TipoCategoria = "gasto" | "ahorro";`
   - `interface Categoria { id: CategoriaId; nombre: string; tipo: TipoCategoria; }`
   - `interface GastoFijoItem { id: string; nombre: string; importe: number; }`
   - `type CategoriaEvento = CategoriaId | "ingreso";`
   - `interface Evento { id: string; nombre: string; importe: number; categoria: CategoriaEvento; }`
   - `interface Mes { id; fecha: Date; mes: string; overrides: Partial<Record<CategoriaId, number>>; eventos: Evento[]; real: Partial<Record<CategoriaId, number | null>>; ingresoNetoOverride: number | null; }`
   - `interface PresupuestoBase { ingresoNeto: number } & Record<CategoriaId, number>` (o interface
     explícita con las 6 claves numéricas).
   - `interface Fase { id: number; nombre: string; edad: string; salarioMin: number; carteraMin: number; desc: string; }`
   - `interface CondicionesBTC { prescindible: boolean; dcaActivo: boolean; }`
   - `interface CompItem { n: string; v: number; }` y `interface Composicion { nombre: string; paises: CompItem[]; sectores: CompItem[]; }`
   - `interface Alerta { t: "good" | "warn" | "bad"; m: string; }`
   - Props de cada componente hijo (aún en el mismo archivo por ahora): `PatrimonioTabProps`,
     `PresupuestoTabProps`, `MetasTabProps`, `MetricProps`. Los setters se tipan como
     `React.Dispatch<React.SetStateAction<T>>`.

   Ajustes de TS obligatorios (la lógica JS actual no tipa bajo `strict`):
   - **Resta de fechas**: `new Date(d.limite) - new Date()` (líneas ~319 y ~995) debe pasar a
     `new Date(d.limite).getTime() - Date.now()`. TS no permite aritmética directa entre `Date`.
   - **`placeholder` numérico**: `placeholder={presupuestoBase.ingresoNeto}` (~867) y
     `placeholder={base}` (~886) — `placeholder` es `string`; envolver con `String(...)`.
   - **Callbacks de recharts** (`formatter`, `tickFormatter`): el valor entra como
     `number | string | (number|string)[]`. Envolver: `(value: number) => eur2(value)` no basta;
     usar `formatter={(value) => eur2(Number(value))}` o un helper tipado. `evolucionAnual`
     usa `formatter={(v)=>v==null?"sin registrar":eur2(v)}` — tipar el parámetro y castear.
   - **`Cell key={i}`**: mantener `key`, pero renombrar el índice a algo descriptivo
     (`sliceIndex`, `barIndex`) para no arrastrar `i` — ver nota de code-semantic abajo.
   - **`Object.fromEntries` tipado**: `CATEGORIA_LABEL` y el `map` de precios devuelven
     `Record<string, ...>`; añadir la anotación de retorno donde el inferido sea `any`/demasiado
     laxo (p. ej. el resultado de `fetchYahooPrice` es `Promise<number>` una vez tipado).
   - **`fetchYahooPrice(ticker: string): Promise<number>`**: tiparlo; sigue lanzando el `throw`
     placeholder (no se conecta backend en esta tarea).
   - **Handlers de eventos**: tipar `onChange` como
     `(event: React.ChangeEvent<HTMLInputElement>)` / `HTMLSelectElement` según corresponda, y
     los `catch {}` sin binding se dejan igual (válido en TS).
   - **`nuevoMes(anio: number, mesIndex: number, overrides?: Partial<Record<CategoriaId, number>>, eventos?: Evento[]): Mes`**.
   - Constantes tipadas: `CARTERA_INICIAL: Posicion[]`, `DEUDAS_INICIAL: Deuda[]`,
     `CATEGORIAS: Categoria[]`, `FASES: Fase[]`, `COMPOSICION: Record<string, Composicion>`,
     `PRESUPUESTO_BASE_INICIAL: PresupuestoBase`.

5. **Comprobar `layout.tsx`**: fijar `lang="es"` en `<html>`. No mover el `<style>`/`@import`
   de Google Fonts todavía (migrar a `next/font` es mejora futura, fuera de alcance).

6. **Eliminar `PortfolioDashboard.jsx`** de la raíz tras verificar que la página funciona.

## Testing strategy
- **Unit**: ninguna en esta tarea. No se solicitan tests y no hay lógica de dominio extraída que
  testear de forma aislada todavía. Cuando en la tarea siguiente se extraigan `derivarCartera`,
  `calcMes` y `proyectarFI` a clases/servicios, ahí se añadirán tests Vitest co-localizados
  (skill `testing`): son funciones puras con entradas/salidas claras, ideales para especificar.
- **Integration (Turso)**: no aplica — no hay persistencia; el estado vive en memoria (`useState`)
  y el Excel de Drive sigue siendo la fuente de verdad, como indica el propio archivo.

## Verificación en runtime (skill `next-dev-loop`)
Requisitos duros del skill: Next.js **16.3+** con **Turbopack** y `agent-browser >= 0.31.1`.
`create-next-app@latest` a esta fecha instala Next 16.x con Turbopack por defecto; confirmar la
versión en `package.json` antes de correr el loop. Si Next quedara por debajo de 16.3, actualizar
(`npx next upgrade`) antes de verificar.

1. `npm run dev` (Turbopack por defecto). Anotar el puerto del banner.
2. Preflight: probar `/_next/mcp` `tools/list`; confirmar `get_compilation_issues`.
3. `get_compilation_issues` -> **compila sin errores** (cero errores de tipos ni de build).
4. `get_errors` tras una navegación -> **sin errores** de servidor ni de navegador.
5. `agent-browser` (sesión con `--scope worktree`, `--restore`) abre la URL raíz y comprueba,
   pestaña a pestaña:
   - **Patrimonio**: total en grande, PieChart de distribución, LineChart de evolución,
     barras RV real vs objetivo, tarjeta "Nota de la cartera". Abrir "Editar cartera" y editar
     una posición sin errores en consola.
   - **Presupuesto**: donut del presupuesto base, selector de mes, desglose editable,
     BarChart presupuestado vs real, LineChart de evolución anual.
   - **Metas**: barras de FI/vivienda/fondo, roadmap de fases, deudas editables, hucha BTC.
6. Revisar la consola del navegador: **sin warnings de React** (keys, hidratación) ni errores de
   recharts. Recharts es client-only; con `"use client"` no debe haber mismatch de hidratación.

## Architecture decisions

- **Qué skills aplican en esta tarea**:
  - `next-dev-loop` — **SÍ**: es el paso de verificación en runtime (arriba).
  - `code-semantic` — **PARCIALMENTE**: aplica a los tipos y nombres *nuevos* que introduzco
    (interfaces con nombres de intención, `catch (error)`, contadores de bucle descriptivos en
    los `.map` que toque). **No** reescribo la lógica existente: el archivo original usa
    abreviaturas (`C`, `eur`, `uid`, `pct`, params `p/i/s/e/d/m/f/k`) que violan el skill, pero
    el alcance es "portar sin romper la lógica", no renombrar. Se documenta como **deuda técnica
    conocida** a saldar en el refactor a componentes.
  - `hexagonal-architecture` — **NO en este paso**: no hay dominio ni infraestructura que separar;
    es una única página client con estado en memoria. El uso de `--src-dir` deja el terreno
    preparado para introducir `src/domain`, `src/application`, `src/infrastructure` cuando lleguen
    datos reales (p. ej. cuando `fetchYahooPrice` deje de ser placeholder y necesite un adaptador
    de infraestructura + puerto). En ese momento, ese fetch pasará a un Route Handler/adaptador,
    no a un `fetch` desde el client.
  - `class-first-architecture` — **NO en este paso**: el usuario pidió explícitamente no dividir
    en componentes ni servicios. `derivarCartera`, `calcMes`, `proyectarFI` son hoy funciones de
    módulo; se dejan así. Candidatas naturales a clases (`CarteraDeriver`, `MesCalculator`,
    `FinancialIndependenceProjector`) en el refactor futuro.
  - `testing` — **NO en este paso**: sin lógica extraída ni persistencia que testear aún.

- **Client component completo**: `"use client"` en `page.tsx`. Todo el árbol depende de hooks y
  recharts; no hay beneficio en separar un Server Component ahora. Al dividir en la tarea futura,
  se podrá extraer un Server Component contenedor y dejar client solo lo interactivo.

- **`--src-dir`**: elegido a propósito para alinear con el layout sugerido por
  `hexagonal-architecture` (`app/` bajo `src/`) y evitar una reorganización cuando aparezcan las
  capas de dominio/aplicación/infraestructura.

- **Tipos en el propio archivo (no en `src/types/`)**: YAGNI. Nada externo los consume todavía y
  el usuario pidió no fragmentar. Se extraerán cuando se dividan componentes.

## Risks and dependencies

- **Directorio no vacío**: `create-next-app` no puede correr en la raíz por `.claude/`. Mitigación:
  scaffolding en carpeta temporal + copia selectiva preservando `.claude/`, `PortfolioDashboard.jsx`
  y `skills-lock.json` (paso 1). Verificar que ningún archivo generado pisa `.claude/`.
- **Compatibilidad recharts / React 19**: Next 16 trae React 19; usar recharts >= 2.15. Si la
  resolución instala una versión incompatible, fijar una compatible. Confirmar en el paso 2.
- **Fricción de `strict`**: las incidencias del paso 4 (resta de fechas, `placeholder` numérico,
  callbacks de recharts) romperán la compilación si no se ajustan. Se decide **mantener
  `strict: true`** y aplicar los arreglos mínimos y locales en vez de relajar el tsconfig.
- **`fetchYahooPrice` sigue siendo placeholder**: lanza error a propósito; el botón "Actualizar
  precios" mostrará el `alert` de CORS. Es el comportamiento esperado, no un bug a arreglar aquí.
- **Requisitos de `next-dev-loop`**: si Next queda < 16.3 o falta `agent-browser >= 0.31.1`, hay
  que actualizar/instalar antes de la verificación en runtime; el skill exige esos mínimos.
- **Orden de ejecución**: scaffold -> instalar recharts -> portar page.tsx -> `next dev` +
  verificación -> borrar `PortfolioDashboard.jsx`. No borrar el `.jsx` hasta que la página cargue
  limpia, para conservar la referencia si hay que reconciliar la conversión.
```

## Nota fuera de alcance (git)
El directorio no es un repo git todavía. `--no-git` evita que `create-next-app` inicialice uno
por su cuenta. Inicializar git no forma parte de esta tarea; hacerlo solo si el usuario lo pide.
