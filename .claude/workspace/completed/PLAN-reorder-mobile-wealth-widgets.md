# Plan: Reordenar los widgets de Patrimonio en la vista mobile

## Goal
En la pestaña **Patrimonio** (`WealthTab`), la vista mobile debe presentar los widgets en este
orden de prioridad:

1. Valor del patrimonio (patrimonio total + métricas)
2. Evolución del patrimonio (gráfico histórico)
3. Distribución del patrimonio (donut/pie de posiciones)
4. Fondo de emergencia / casa
5. El resto de tarjetas (Nota de la cartera, Estado del plan, Renta variable real vs objetivo,
   "Qué hay dentro de cada fondo") en el orden que quede mejor de UI/UX.

El objetivo es que, al abrir la app en el móvil, lo primero que vea el usuario sea cuánto tiene,
cómo evoluciona y cómo se reparte, dejando el detalle analítico más abajo. **El layout de desktop
no debe cambiar.**

## Affected layers
[ ] domain  [ ] application  [ ] infrastructure  [x] UI

Es un cambio exclusivamente de presentación (orden visual de tarjetas). No toca dominio, casos de
uso, puertos, repositorios ni el esquema de Turso. No hay migración.

## Estado actual (análisis)

El sistema de estilos **no es Tailwind**: son estilos inline + un bloque `<style>` global en
`src/app/AppStyles.tsx` con clases utilitarias (`.grid`, `.card`, `.span-full`, `.span-2`,
`.hide-sm`) y media queries en 900 / 760 / 640 / 420 px. El "límite mobile" del proyecto es
**760px** (ahí aparece la `.mobile-tabbar`, se oculta `.desktop-tabnav` y actúa `.hide-sm`).

En `src/features/wealth/components/WealthTab.tsx`:

- La tarjeta de **valor del patrimonio** (línea ~226) está **fuera** del `.grid`, como hermano
  previo. Por tanto ya es la primera y no hay que tocarla; además `order` no le afecta porque no
  es hija del grid.
- Las demás tarjetas son hijas del contenedor
  `.grid` con `gridTemplateColumns: repeat(auto-fit, minmax(min(100%,340px),1fr))` (línea ~362).
  En desktop es multi-columna con auto-flow; en mobile colapsa a una sola columna y el orden
  vertical = **orden del DOM**.

Orden actual de las tarjetas dentro del grid (= orden mobile actual):

1. `WealthTargetsOnboarding` (solo si `wealthTargets == null`)
2. Nota de la cartera (score) — ~línea 366
3. Distribución del patrimonio — ~línea 390
4. Estado del plan (alerts) — ~línea 418
5. Renta variable · real vs objetivo (`span-full`) — ~línea 444
6. Evolución del patrimonio (`span-full`) — ~línea 475
7. Fondo de emergencia / casa (`card` o `card span-full` según `compositionKeys`) — ~línea 508
8. Qué hay dentro de cada fondo (`span-2`, solo si `compositionKeys.length > 0`) — ~línea 533

Actualmente el orden mobile **no** coincide con el pedido: Evolución y Fondo de emergencia
aparecen demasiado abajo, y Nota/Estado del plan/Renta variable van antes que la Distribución.

## Decisión de enfoque

Se compararon tres opciones:

- **A. CSS `order` dentro de un `@media (max-width:760px)`** (recomendada). Se etiqueta cada
  tarjeta del grid con una clase semántica y, solo en mobile, se les asigna `order`. Fuera de la
  media query `order` vale 0 → **desktop conserva su auto-flow intacto**. Es CSS puro, mínimo, sin
  duplicar JSX, y encaja con el patrón del proyecto (AppStyles ya aloja clases específicas de
  feature: `.compo`, `.roadmap`, `.deuda-row`…). Los estilos inline **no** pueden contener media
  queries, así que la clase en `AppStyles` es la vía natural.
- **B. Reestructurar/duplicar el JSX condicionalmente por breakpoint.** Descartada por YAGNI y por
  romper DRY (dos árboles a mantener, riesgo de divergencia).
- **C. Reordenar el DOM directamente.** Descartada: cambiaría también el layout de desktop, que el
  usuario ha pedido mantener.

Se elige **A**.

## Files to create/modify

- `src/features/wealth/components/WealthTab.tsx` — añadir una clase semántica a cada `<div className="card …">`
  hija del `.grid` (sin alterar las clases existentes `span-full` / `span-2` ni las condicionales).
  Nombres propuestos (intención de negocio, no técnicos):
  - Nota de la cartera → `widget-portfolio-score`
  - Distribución → `widget-wealth-distribution`
  - Estado del plan → `widget-plan-status`
  - Renta variable → `widget-equity-targets`
  - Evolución → `widget-wealth-evolution`
  - Fondo de emergencia → `widget-emergency-fund`
  - Qué hay dentro de cada fondo → `widget-fund-composition`
  - (`WealthTargetsOnboarding` → ver "Riesgos / edge case" sobre el estado sin objetivos)
- `src/app/AppStyles.tsx` — añadir, dentro del bloque `@media (max-width:760px)` ya existente (o en
  uno nuevo con el mismo breakpoint), las reglas `order` para las tres tarjetas que suben. El resto
  se queda en `order:0` y mantiene su orden de DOM relativo.

## Implementation steps

1. En `WealthTab.tsx`, añadir la clase semántica correspondiente a cada tarjeta hija del `.grid`,
   respetando las clases y condicionales actuales. Ejemplos:
   - Evolución: `className="card span-full widget-wealth-evolution"`
   - Distribución: `className="card widget-wealth-distribution"`
   - Fondo de emergencia: conservar la condicional existente y anexar la clase, p. ej.
     `` className={`${compositionKeys.length > 0 ? "card" : "card span-full"} widget-emergency-fund`} ``
   - Resto de tarjetas: anexar su clase `widget-*` sin quitar `span-full` / `span-2`.
2. En `AppStyles.tsx`, dentro de `@media (max-width:760px)`, definir el orden (valores negativos
   para "subir" por encima del grupo por defecto `order:0`):
   ```css
   .widget-wealth-evolution   { order:-3; }
   .widget-wealth-distribution{ order:-2; }
   .widget-emergency-fund     { order:-1; }
   ```
   Con esto el orden vertical en mobile queda:
   valor (fuera del grid) → Evolución → Distribución → Fondo de emergencia →
   Nota de la cartera → Estado del plan → Renta variable → Composición.
3. Verificar visualmente en un viewport ≤760px que el orden es el pedido y que a >760px (tablet y
   desktop) el layout no cambia (los `order` no aplican).
4. Comprobar el caso de usuario nuevo (`wealthTargets == null`): ver "Riesgos / edge case".

## Testing strategy

- **Unit (Vitest + RTL):** jsdom **no** calcula media queries ni layout, por lo que no se puede
  aсertar el orden visual real en un test unitario. Se puede añadir, si se quiere red de seguridad,
  un test que verifique que cada tarjeta lleva su clase `widget-*` esperada (marcador de que el
  cableado de estilos sigue en su sitio). Los tests existentes en `WealthTab.unit.test.tsx` usan
  queries por texto/rol y **no** dependen del orden del DOM, así que no se rompen.
- **Integration (Turso):** no aplica — cambio puramente de UI, sin acceso a datos.
- **Verificación manual / visual:** responsive en el navegador a 375px y 768px (o el skill
  `next-dev-loop` / DevTools) confirmando el nuevo orden en mobile y layout intacto en desktop.

## Architecture decisions

- **Separación de responsabilidades (UI-only):** el orden es concern de presentación → se resuelve
  con CSS (`order`) y no reestructurando la lógica del componente. Coherente con hexagonal: nada
  por debajo de la capa UI cambia.
- **CSS `order` scoped a mobile en vez de reordenar el DOM:** cumple el requisito de "solo mobile"
  sin tocar desktop y sin ramas condicionales de render (KISS/DRY, code-semantic).
- **Clases semánticas `widget-*`:** nombres que expresan intención de negocio (patrimonio,
  distribución, fondo de emergencia), no atajos técnicos, alineado con `code-semantic`.
- **AppStyles como ubicación:** se sigue la convención ya existente del proyecto de alojar clases de
  feature en el bloque global; los estilos inline no admiten media queries.
- **Breakpoint 760px:** se reutiliza el límite "mobile" ya definido en el proyecto (tabbar,
  `.hide-sm`) para no introducir un breakpoint nuevo e inconsistente.

## Risks and dependencies

- **Edge case — usuario sin objetivos (`wealthTargets == null`):** `WealthTargetsOnboarding` es la
  primera hija del grid y quedaría con `order:0`, es decir, tras Evolución/Distribución/Fondo (que
  en ese estado muestran su empty-state). Para un usuario nuevo probablemente interese que el CTA de
  onboarding siga visible arriba. **Decisión a confirmar:** darle `order:-4` (aparece primero dentro
  del grid, justo bajo el valor) o dejarlo en "el resto" según la letra del pedido. Recomendación:
  `order:-4` para no esconder la única acción útil del estado vacío. Se deja documentado para que el
  implementador/usuario decida.
- **`order` + `span-full`/`span-2`:** compatibles; `grid-column` controla el ancho y `order` la
  secuencia. En mobile el grid es de una columna, así que el span es irrelevante y el orden manda.
- **Sin dependencias externas** ni cambios de datos, API o esquema.
- **Orden de implementación:** primero añadir las clases en el JSX (paso 1), luego las reglas en
  AppStyles (paso 2); así en ningún commit intermedio queda una regla `order` apuntando a una clase
  inexistente.
- **No hay Tailwind** en esta zona pese a la mención del contexto: el enfoque `order-*` por
  breakpoint de Tailwind no aplica; se usa CSS del propio `AppStyles`.
