# Review: Deudas solo-lectura/Guardar + icono de marca + PWA instalable

## Verdict: PASS

Las tres partes cumplen los estándares de TypeScript, arquitectura hexagonal, class-first y
code-semantic. No hay hallazgos bloqueantes. El fix de seguridad de `src/proxy.ts` es correcto y no
abre ningún hueco. Se listan varias observaciones no bloqueantes, una de ellas importante (falsa
confianza del e2e).

## Blocking findings
- Ninguno.

## Warnings (non-blocking) — RESUELTOS 2026-07-12

- `e2e/pwa.e2e.spec.ts` — **Fijado.** Nuevo `test.describe("PWA installability for a signed-out
  visitor", ...)` con `test.use({ storageState: { cookies: [], origins: [] } })`, que verifica
  `/manifest.webmanifest`, `/icon` y `/pwa-icons/192` devuelven 200 sin sesión, y que una ruta
  protegida real (`/`) sigue redirigiendo a `/login` para un visitante sin sesión (evita que el fix
  del proxy se pase de generoso). Este es ahora el regression test real del fix de `proxy.ts`.
- `src/features/goals/components/DebtsSection.tsx` — **Fijado.** El indicador "Guardado ✓" se movió
  fuera del bloque `{editing && (...)}`, junto al botón "Editar deudas"/"Cerrar edición" (que se
  renderiza siempre que la sección está abierta), así que sigue visible tras `saveDraftDebts` poner
  `editing` a `false`. Cubierto con un nuevo test que guarda un cambio y comprueba que el texto
  "Guardado ✓" aparece junto al botón "Editar deudas".
- `src/app/manifest.ts` / `src/app/pwa-icons/[size]/route.tsx` — **Fijado.** El Route Handler acepta
  ahora `?purpose=any` (usa `brandIconRenderer.render`, sin safe-zone) además del `renderMaskable`
  por defecto; el manifest declara 4 entradas de icono (192/512 × any/maskable). Test e2e nuevo
  cubre `/pwa-icons/192?purpose=any` y `/pwa-icons/512?purpose=any`; `manifest.unit.test.ts` verifica
  que existen entradas con `purpose: "any"` además de las `"maskable"`.

- `src/features/goals/components/DebtsSection.tsx:131,135` — inputs numéricos controlados con
  `value={debt.installment}` + `parseFloat(value) || 0`: al vaciar el campo salta a `0` en vez de
  quedar vacío (misma UX que el código previo y que `GoalsTab`). El uso de `|| 0` aquí es correcto
  (hay que capturar `NaN`, que `??` no capturaría), así que no es una violación de la regla `??`.
  Solo se anota como matiz de UX heredado.

## Verificación de los puntos críticos

1. **Seguridad del proxy** — Correcto. El matcher
   `"/((?!api/auth|login|manifest.webmanifest|icon|apple-icon|pwa-icons|_next/static|_next/image|favicon.ico).*)"`
   sigue matcheando `/` (el lookahead negativo tiene éxito sobre cadena vacía) y todas las rutas de
   datos (`/api/prices`, `/api/prices/history` siguen protegidas; solo `api/auth` se excluye). Las
   nuevas exclusiones son metadatos/imágenes de marca sin datos de usuario y no colisionan por
   prefijo con ninguna ruta real de la app (no existe ruta protegida que empiece por `icon`,
   `apple-icon`, `manifest.webmanifest` ni `pwa-icons`). No se abre ningún hueco no intencionado.

2. **Convivencia con autoguardado (Parte A)** — Confirmado. `DebtsSection` no importa ni llama a
   `saveDebts` ni a ninguna Server Action; solo usa `setDebts(draftDebts)` (prop del shell) en
   `saveDraftDebts`. Toda edición carácter a carácter opera sobre `draftDebts` vía `setDraftDebts`;
   `setDebts` no se toca hasta pulsar "Guardar cambios". Los tests lo prueban explícitamente (no
   persiste por tecla, Guardar aplica una vez, añadir/eliminar no persisten hasta Guardar).

3. **Desviación `setSaved(false)`** — Razonable, no introduce bug (ver warning arriba).

4. **`purpose: "maskable"`** — Suficiente para instalabilidad; recomendable complementar con `"any"`
   (warning arriba).

5. **Class-first / code-semantic** — `BrandIconRenderer` es clase con `render`/`renderMaskable`
   públicos y `renderIcon` privado, con constantes de ratio semánticas y singleton exportado. Sin
   comentarios explicativos. Los helpers de `DebtsSection` son closures dentro del componente React,
   coherente con el patrón ya establecido (`BudgetMonthlyBreakdown`), aceptable para UI.

6. **Cobertura de tests** — `DebtsSection.unit.test.tsx` (8 casos) y `manifest.unit.test.ts` (3)
   pasan y cubren los casos críticos con queries por rol semántico. El e2e de PWA verifica el shape
   pero con sesión autenticada (ver warning: no es regression real del fix del proxy).

7. **Metadata de `layout.tsx`** — Correcto. `themeColor` se movió al export `viewport` (patrón Next
   16), no duplicado en `metadata`. `applicationName`/`appleWebApp` en `metadata`. Sin referencia
   manual a `favicon.ico` (asset eliminado).

## Positive points
- El fix de `src/proxy.ts` es mínimo, correcto y bien acotado a assets públicos.
- `BrandIconRenderer` centraliza el dibujo de marca (DRY) y lo consumen los tres puntos (favicon,
  apple-icon, PNGs del manifest) variando solo el tamaño; ratios extraídos a constantes con nombre.
- `pwa-icons/[size]/route.tsx` valida el tamaño con type-guard (`isValidIconSize`) y responde 400 a
  tamaños fuera de `[192, 512]`, con `generateStaticParams` para prerender — evita ruta abierta a
  tamaños arbitrarios.
- Parte A cumple exactamente el modelo del resto de la app (borrador local + Guardar → autosave del
  shell) sin tocar `FinanceAppShell` ni duplicar lógica de persistencia.
- Tests de componente por rol semántico, sin selección por clase CSS, cubriendo el cambio de
  comportamiento clave (no persistir por tecla).
- Cero `any` en producción; todas las funciones públicas con tipo de retorno explícito.
