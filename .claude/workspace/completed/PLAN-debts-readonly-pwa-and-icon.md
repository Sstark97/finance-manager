# Plan: Deudas colapsable + solo-lectura + Guardar, icono de marca y PWA instalable

## Goal
Tres mejoras independientes sobre `finance-manager`:

- **A — Deudas**: la sección "Deudas y patrimonio neto" (hoy en `GoalsTab.tsx`) pasa a ser
  colapsable (cerrada por defecto), muestra por defecto una **vista de solo lectura** y ofrece un
  **modo de edición explícito** con botones "Guardar" / "Descartar", replicando el patrón ya
  existente en `BudgetMonthlyBreakdown.tsx` (borrador separado + `hasUnsavedChanges`) y el toggle
  colapsable de `WealthTab.tsx`. Se elimina el autoguardado "por tecla".
- **B — Icono de marca**: favicon y touch icon generados programáticamente con `ImageResponse`
  (`next/og`) vía las convenciones de fichero `app/icon.tsx` / `app/apple-icon.tsx`, sin assets
  externos ni generadores de terceros, coherentes con `palette` (`src/lib/theme.ts`).
- **C — PWA instalable**: `app/manifest.ts` (`MetadataRoute.Manifest`) + los PNG 192/512 que exige
  el manifest, también generados con `ImageResponse` reutilizando el mismo render del icono. Push y
  offline/Service Worker quedan **explícitamente fuera de alcance** (razonamiento abajo).

Por qué: mejor UX de edición de deudas (sin guardados accidentales), identidad visual propia e
instalabilidad como app.

## Affected layers
[ ] domain  [ ] application  [ ] infrastructure  [x] UI (feature UI + convenciones de metadatos de Next.js App Router)

Ninguna de las tres partes toca `domain/`, `application/` ni el esquema Turso. No hay migración.
La persistencia de deudas ya existe (`SaveDebts` / `TursoDebtRepository` en `src/shared`) y se
reutiliza sin cambios. El manifest no requiere tabla `subscriptions` porque no se implementa push.

---

## Files to create/modify

### Parte A — Deudas
- `src/features/goals/components/DebtsSection.tsx` — **crear**. Componente que encapsula:
  colapsable (estado `sectionOpen`, cerrado por defecto, con la flecha `▸` que rota como en
  `BudgetMonthlyBreakdown`), vista de solo lectura de las deudas, modo edición con borrador local
  (`draftDebts`), `hasUnsavedChanges` (comparación JSON draft vs `debts`), botones
  "Guardar cambios" / "Descartar", y las métricas "Deuda total" / "Patrimonio neto".
- `src/features/goals/components/GoalsTab.tsx` — **modificar**. Sustituir el bloque
  `<div className="card span-2"> … Deudas y patrimonio neto …</div>` (líneas ~130-167) por
  `<DebtsSection debts={debts} setDebts={setDebts} portfolioTotal={total} />`. Eliminar de
  `GoalsTab` los helpers de edición en vivo de deudas y sus tipos: `editDebtText`, `editDebtNumber`,
  `markSettled`, `removeDebt`, `addDebt`, `totalDebt`, `netWorth`, `EditableDebtTextField`,
  `EditableDebtNumberField` (se mueven a `DebtsSection`). `total` sigue viniendo de
  `portfolioDerived` y se pasa como `portfolioTotal`.
- `src/features/goals/components/DebtsSection.unit.test.tsx` — **crear** (test de componente).
- `src/app/AppStyles.tsx` — **modificar solo si hace falta**. Se reutilizan `.card`, `.eyebrow`,
  `.seg`, `.seg.on`, `.inp`, `.deuda-row`. Para la fila de solo lectura basta con markup inline
  usando `palette`; si el diseño lo pide, añadir una clase mínima `.deuda-readonly` (no
  imprescindible). Preferir no tocar este fichero salvo necesidad real (YAGNI).

### Parte B — Icono
- `src/app/branding/BrandIconRenderer.tsx` — **crear**. Clase con la lógica de dibujo del icono en
  un único sitio (DRY), consumida por `icon.tsx`, `apple-icon.tsx` y la ruta de iconos del manifest.
- `src/app/icon.tsx` — **crear**. Favicon generado (`ImageResponse`, ~32×32).
- `src/app/apple-icon.tsx` — **crear**. Apple touch icon 180×180.
- `src/app/favicon.ico` — **eliminar**. Es el asset por defecto de `create-next-app`; con
  `app/icon.tsx` presente sobra y evita un `<link rel="icon">` duplicado/conflictivo.
- `src/app/layout.tsx` — **modificar**. Metadatos: `title`/`description` en español coherentes con
  la app, `applicationName`, `appleWebApp` (`{ capable: true, title, statusBarStyle }`); y
  `export const viewport: Viewport = { themeColor: palette.bg }` (en Next 16 `themeColor` va en el
  export `viewport`, no en `metadata`).

### Parte C — PWA instalable
- `src/app/manifest.ts` — **crear**. `MetadataRoute.Manifest`: `name`, `short_name`, `description`,
  `start_url: "/"`, `display: "standalone"`, `background_color: palette.bg`,
  `theme_color: palette.bg`, `icons` con 192 y 512 (`type: "image/png"`, `purpose: "any maskable"`).
- `src/app/pwa-icons/[size]/route.tsx` — **crear**. Route Handler que devuelve el PNG del icono en
  el tamaño pedido (192/512) usando `ImageResponse` + `BrandIconRenderer` (con padding "safe zone"
  para `maskable`). El manifest apunta a `/pwa-icons/192` y `/pwa-icons/512`. Segmento `pwa-icons`
  (no `icon`) para no chocar con la convención reservada `icon`.
- `src/app/manifest.unit.test.ts` — **crear** (test barato del shape del manifest).
- `e2e/pwa.e2e.spec.ts` — **crear** (opcional, e2e ligero de instalabilidad).

---

## Implementation steps

### Parte A
1. Crear `DebtsSection` (client component). Props:
   `{ debts: Debt[]; setDebts: React.Dispatch<React.SetStateAction<Debt[]>>; portfolioTotal: number }`.
2. Estado local:
   - `sectionOpen` (`useState(false)`) → colapsable, cerrado por defecto.
   - `editing` (`useState(false)`) → modo edición explícito.
   - `draftDebts` (`useState<Debt[]>(debts)`) → borrador; **todas** las mutaciones (nombre, nota,
     cuota, saldo, añadir, eliminar, liquidar) operan sobre el borrador, no sobre `debts`.
3. Sincronizar borrador con la prop cuando cambie desde fuera y **no** estemos editando, siguiendo el
   patrón "derivar en render" de `BudgetMonthlyBreakdown` (comparar un id/snapshot y hacer `setState`
   dentro del render, sin `useEffect`): si `!editing` y `JSON.stringify(debts) !== syncedSnapshot`,
   resetear `draftDebts` y `syncedSnapshot`. Al entrar en edición se parte de la copia actual.
4. `hasUnsavedChanges = JSON.stringify(draftDebts) !== JSON.stringify(debts)` (idéntico criterio al
   de `BudgetMonthlyBreakdown`).
5. Helpers de borrador dentro de la clase de comportamiento del componente (nombres semánticos):
   `renameDebt`, `editDebtNote`, `editDebtInstallment`, `editDebtBalance`, `settleDebt`,
   `removeDebt`, `addDebt` — todos vía `setDraftDebts`. `parseFloat(value) || 0` para numéricos.
6. `saveDebts()` → `setDebts(draftDebts)` y salir del modo edición (`setEditing(false)`); mostrar un
   "Guardado ✓" efímero como en `BudgetMonthlyBreakdown`. `discardChanges()` → `setDraftDebts(debts)`
   y `setEditing(false)`.
7. Render:
   - Cabecera: botón `eyebrow` con flecha `▸` que hace toggle de `sectionOpen` ("Deudas y
     patrimonio neto"), y a la derecha un resumen siempre visible ("Deuda total" del estado
     guardado), como el "Sobrante (guardado)" del breakdown.
   - Cuerpo visible solo si `sectionOpen`:
     - Botón `seg on` "Editar deudas" / "Cerrar edición" (patrón de `WealthTab`).
     - Si `!editing`: **vista de solo lectura** — por cada deuda, nombre, nota, cuota/mes y saldo en
       texto (`.num` para importes con `currencyFormatter.euro`), sin inputs ni botones destructivos.
       Empty state cuando `debts.length === 0` ("Aún no has añadido deudas.").
     - Si `editing`: los inputs actuales (reutilizando `.deuda-row`, `.inp`) sobre `draftDebts`, con
       "Liquidar"/"Eliminar" y "+ Añadir deuda"; y la barra de acciones
       `Guardar cambios` (`seg on`, `disabled={!hasUnsavedChanges}`) + `Descartar`
       (solo si `hasUnsavedChanges`) + aviso "Cambios sin guardar" / "Guardado ✓".
     - Métricas "Deuda total" y "Patrimonio neto" (`portfolioTotal - totalDebt`) con `Metric`. En
       solo-lectura reflejan `debts`; en edición pueden reflejar `draftDebts` para feedback en vivo.
8. Editar `GoalsTab.tsx`: importar y renderizar `DebtsSection`, borrar el código de deudas migrado y
   sus tipos locales. Verificar que ya no queda ninguna referencia a los helpers eliminados.

### Parte B
1. `BrandIconRenderer`: método `render(dimension: number): React.ReactElement` que devuelve el JSX
   del icono (contenedor flex `width/height = dimension`, fondo `palette.bg`, `borderRadius`
   proporcional, glifo de acento `palette.acc`). Método opcional `renderMaskable(dimension)` que
   añade padding de safe-zone (~10-12%) para el manifest. Colores importados de `@/lib/theme` (DRY).
   - Diseño propuesto del glifo (decisión de diseño, ajustable): símbolo **"€"** centrado en
     `palette.acc` sobre cuadrado redondeado `palette.bg`. Alternativa: monograma o motivo de barras
     ascendentes dibujado con `div`s. Se elige "€" por ser inequívoco (gestor de finanzas), legible
     a 32px y sin depender de fuentes externas (glifo Unicode base). Documentar en el PR la elección.
2. `app/icon.tsx`: `export const size = { width: 32, height: 32 }`, `export const contentType =
   "image/png"`, `export default function Icon() { return new ImageResponse(brandIconRenderer.render(32), { ...size }); }`.
3. `app/apple-icon.tsx`: igual con `size = { width: 180, height: 180 }` (usar `renderMaskable(180)`
   para que respire en iOS).
4. Eliminar `src/app/favicon.ico`.
5. `layout.tsx`: actualizar `metadata` (title, description, applicationName, appleWebApp) y añadir
   `export const viewport: Viewport = { themeColor: palette.bg }`. No hace falta declarar `manifest`
   en `metadata`: Next enlaza `app/manifest.ts` automáticamente.

### Parte C
1. `app/manifest.ts`: función por defecto que devuelve el objeto `MetadataRoute.Manifest` con los
   campos listados; `icons` referencia `/pwa-icons/192` y `/pwa-icons/512`.
2. `app/pwa-icons/[size]/route.tsx`: `GET` que lee `size` del segmento, valida contra `[192, 512]`
   (400 si no válido), y devuelve `new ImageResponse(brandIconRenderer.renderMaskable(size), { width: size, height: size })`.
   `ImageResponse` produce PNG, que es exactamente lo que pide el manifest.
   - Nota Next 16: si con `dynamicIO`/`cacheComponents` una ruta dinámica exige config estática,
     añadir `export function generateStaticParams() { return [{ size: "192" }, { size: "512" }]; }`
     para prerenderizar ambos tamaños.
3. Verificar instalabilidad (ver Testing).

---

## Testing strategy

### Parte A — test de componente (alto valor)
`DebtsSection.unit.test.tsx`, mismo patrón que `BudgetMonthlyBreakdown.unit.test.tsx`:
`// @vitest-environment jsdom`, RTL + `userEvent`, un wrapper con estado
(`StatefulDebtsSection` que mantiene `debts` con `useState` y captura las llamadas a `setDebts`).
Casos (specs auto-descriptivos):
- **cerrada por defecto**: el detalle de deudas no está en el documento hasta pulsar la cabecera.
- **solo lectura por defecto**: tras abrir, se ven los saldos como texto y **no** hay inputs de
  edición ni botones "Eliminar" (query por rol: no hay `spinbutton`/`textbox` de deuda visibles).
- **entrar en edición** muestra los inputs.
- **no persiste por tecla**: al editar un saldo en el borrador, `setDebts` **no** se llama; solo
  cambian los inputs. (Éste es el cambio de comportamiento clave frente al código actual.)
- **Guardar aplica el borrador**: tras editar y pulsar "Guardar cambios", `setDebts` se llama una vez
  con el saldo nuevo; el botón está deshabilitado si `!hasUnsavedChanges`.
- **Descartar revierte**: tras editar y "Descartar", el borrador vuelve al valor original y
  `setDebts` no se llamó.
- **añadir/eliminar** en el borrador no llega a `setDebts` hasta "Guardar".

### Parte B/C — sin unit tests de bajo valor para los ficheros de imagen
- `manifest.unit.test.ts`: invoca la función del manifest y asegura `name`, `short_name`,
  `display === "standalone"`, `start_url === "/"`, y que `icons` incluye entradas 192 y 512 con
  `type: "image/png"`. Barato y protege contra regresiones de campos requeridos por instalabilidad.
- **No** se testean unitariamente `icon.tsx` / `apple-icon.tsx` / `pwa-icons/[size]/route.tsx`:
  renderizan PNG binario vía `ImageResponse`, coste alto y valor bajo. Se verifican por e2e/manual.
- `e2e/pwa.e2e.spec.ts` (Playwright, ligero, opcional): navegar a `/` y comprobar
  `link[rel="manifest"]`; `GET /manifest.webmanifest` → 200 y JSON con icons 192/512;
  `GET /pwa-icons/192` y `/pwa-icons/512` → 200 con `content-type: image/png`;
  `link[rel="icon"]` y `link[rel="apple-touch-icon"]` presentes.
- **Verificación manual de instalabilidad**: `next dev` (Turbopack, sin flags) + DevTools →
  Application → Manifest (sin errores, iconos cargan) y disponibilidad del prompt de instalación; o
  Lighthouse (categoría PWA/installability) tras `next build && next start`, o directamente en el
  deploy de Vercel (HTTPS ya provisto). No se requiere `--experimental-https` porque no hay push.

---

## Architecture decisions

1. **Parte A es puramente capa UI.** No se introduce dominio, use case ni puerto nuevos (YAGNI /
   `code-semantic`): editar un array de `Debt` es estado de cliente. El comportamiento se encapsula
   en un componente `DebtsSection` con nombres de método que expresan intención
   (`settleDebt`, `discardChanges`…), no en funciones sueltas dispersas (`class-first`). Se
   extrae de `GoalsTab` para respetar responsabilidad única: `GoalsTab` orquesta tarjetas; la lógica
   de borrador/guardado de deudas vive en su propio componente, igual que `BudgetMonthlyBreakdown`.

2. **Convivencia con el autoguardado del shell (decisión central de la Parte A).** Hoy
   `FinanceAppShell` tiene un `useEffect` con debounce de 800ms sobre `debts` que llama a la Server
   Action `saveDebts`. **El botón "Guardar" de `DebtsSection` NO llama a ninguna Server Action ni a
   `saveDebts` directamente**: simplemente aplica el borrador con `setDebts(draftDebts)` (el
   `setDebts` del shell recibido por props). Ese cambio de estado dispara **una sola vez** el
   `useEffect` de deudas del shell, que persiste tras 800ms. Ventajas:
   - No se duplica la lógica de persistencia ni se toca `FinanceAppShell` ni la Server Action.
   - Es exactamente el modelo del resto de la app: `WealthTab` y `BudgetTab` también mutan solo el
     estado del shell y confían en el autoguardado con debounce; `BudgetMonthlyBreakdown` ya combina
     "borrador + Guardar local → autosave del shell". Coherencia total.
   - El cambio real de UX es **dónde** se confirma la edición: pasa de "cada tecla muta el estado del
     shell" a "solo al pulsar Guardar se muta el estado del shell (y entonces autoguarda una vez)".
   No se elimina ni modifica el debounce del shell: sigue siendo la única vía de escritura a Turso.

3. **Iconos: enfoque `ImageResponse` programático, compatible con Turbopack.** Las convenciones
   `app/icon.tsx`, `app/apple-icon.tsx`, `app/manifest.ts` y los Route Handlers con `ImageResponse`
   se renderizan en servidor y **no dependen del bundler**: funcionan con Turbopack por defecto sin
   flags ni configuración de webpack. Se evita cualquier generador de imágenes externo. El dibujo del
   icono se centraliza en `BrandIconRenderer` (una sola fuente de verdad de la marca, DRY) que
   consumen los tres puntos (favicon, apple-icon y PNGs del manifest), variando solo el tamaño.

4. **PNGs 192/512 del manifest sin herramientas externas.** El manifest exige URLs a PNGs; la
   convención `app/icon.tsx` alimenta el `<link rel="icon">` pero **no** el array `icons` del
   manifest. Solución nativa y Turbopack-friendly: un Route Handler `pwa-icons/[size]` que devuelve
   `ImageResponse` (PNG) reutilizando `BrandIconRenderer`, referenciado explícitamente desde
   `manifest.ts`. Así los dos tamaños salen del mismo código que el favicon, sin assets estáticos ni
   scripts de build que rendericen PNGs a `public/`.

5. **Instalabilidad sin Service Worker.** Chrome moderno ya **no** exige un Service Worker con
   handler `fetch` para ofrecer el prompt de instalación: bastan manifest válido + iconos 192/512 +
   `display: standalone` + `start_url` + HTTPS (Vercel). Por tanto "instalable + icono" satisface el
   pedido "convertir la app en una PWA" sin introducir un SW.

## Fuera de alcance (documentado con razón técnica)

- **Notificaciones push (Web Push).** Excluidas esta iteración. Coste/infra alto (claves VAPID,
  `public/sw.js`, Server Actions `subscribeUser`/`sendNotification`, tabla `subscriptions` +
  migración Turso, gestión de permisos) y **valor bajo ahora**: la app no tiene eventos de servidor
  que notificar (todo es edición manual del usuario + fetch de precios en cliente). El pedido del
  usuario ("convertir en PWA") se cumple con instalable + icono. Se deja como feature futura opcional
  si aparece un disparador real de notificación.
- **Offline / cacheo con Service Worker (Serwist).** Excluido por una **restricción técnica real**:
  Serwist requiere webpack — obliga a `next build --webpack` y no soporta el dev server de Turbopack
  (`next dev --webpack` para probar el SW), lo que rompería el default Turbopack confirmado en el log
  del proyecto (verificado en docs de Serwist y guías de PWA en Next.js 16, jul 2026). Alternativa
  considerada y descartada por ahora: un `public/sw.js` mínimo escrito a mano (registrado en cliente,
  sin tooling de webpack) — es viable con Turbopack, pero para una app data-driven que depende de
  lecturas frescas de Turso y de precios en vivo, cachear el app-shell añade riesgo de servir versión
  obsoleta y coste de versionado/invalidación de caché sin beneficio claro en esta iteración. Se deja
  documentado como el camino futuro preferente (SW a mano antes que Serwist) para no perder Turbopack.

## Risks and dependencies

- **`next/og` / `ImageResponse`** viene con Next 16 (no hay que añadir dependencia). Ejecutar en
  runtime Edge/Node por defecto de la convención; sin fuentes externas el glifo "€" usa la fuente del
  sistema del renderer — validar visualmente el resultado a 32/180/192/512px y ajustar tamaño de
  fuente/padding. Si se quisiera una tipografía concreta habría que embeber una fuente (evitar salvo
  necesidad).
- **`favicon.ico` eliminado**: confirmar que no queda referencia manual en `layout.tsx` ni en HTML;
  con `app/icon.tsx` Next genera los `<link>` correctos. `/favicon.ico` puede devolver 404 tras el
  borrado, lo cual es aceptable (los navegadores usan el `<link rel="icon">` PNG).
- **Ruta dinámica `pwa-icons/[size]`** con `cacheComponents`/`dynamicIO` (si está activo en el
  proyecto): añadir `generateStaticParams` para 192/512 y validar el `size` para no dejar la ruta
  abierta a tamaños arbitrarios.
- **Sincronización borrador↔prop en `DebtsSection`**: seguir el patrón "derivar en render con
  snapshot" de `BudgetMonthlyBreakdown` (no `useEffect`) para evitar loops; garantizar que si el
  usuario está `editing`, un refresh externo de `debts` (p. ej. re-render del shell) no pisa el
  borrador — solo se resincroniza cuando `!editing`.
- **Orden de implementación sugerido**: A (independiente, mayor valor de usuario) → B (icono, base de
  la marca) → C (manifest + `pwa-icons`, depende de `BrandIconRenderer` de B). B y C comparten
  `BrandIconRenderer`, así que implementar B antes que C.
- **e2e**: `next dev` arranca `predev` (`scripts/setup-local-dev-db.mjs`); el e2e de PWA no necesita
  datos, solo rutas de metadatos, así que es barato y estable.
