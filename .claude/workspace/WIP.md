# WIP: Haz un analisis de la app, revisa las principales competidoras, y plantea mejoras de UX/UI, nuevas features que puedan ser utiles y que no esten para llevar mis finanzas, cualquier posible mejora
## Task
Haz un analisis de la app, revisa las principales competidoras, y plantea mejoras de UX/UI, nuevas features que puedan ser utiles y que no esten para llevar mis finanzas, cualquier posible mejora
## Phase
Implementation (Fase 2/3 — Mejoras grandes)
## Log
- [2026-07-18 10:41] Phase started: Planning
- [2026-07-18 10:46] Agent: planner — Plan created in planning/PLAN-analisis-producto-mejoras.md
- [2026-07-18 10:52] Usuario aprueba "implementa todo" salvo PSD2, ejecución por fases con checkpoint. Plan movido a progress/.
- [2026-07-18 10:52] Phase started: Implementation — Fase 1 (quick wins: tab Deudas, accesibilidad, recap mensual, avisos deadline, export CSV/JSON, alertas de umbral)
- [2026-07-18 12:31] Agent: fullstack-developer — Fase 1 completa. tsc/tests(318)/lint en verde. Sin migraciones. Pasando a review.
- [2026-07-18 13:20] Agent: code-reviewer — PASS. 2 warnings no bloqueantes (patrón ARIA de tabs incompleto; FinanceDataExporter.ts ubicado en src/app/ en vez de src/shared/domain/). REVIEW-fase1-quick-wins.md en review/.
- [2026-07-18 13:40] Warnings corregidos (tabpanel ARIA correcto, FinanceDataExporter movido a src/shared/domain/). tsc/lint/tests(318) en verde. Commit 96bcd57. REVIEW movida a completed/.
- [2026-07-18 13:40] Phase started: Implementation — Fase 2 (mejoras grandes: dashboard patrimonio neto, registro de movimientos [pivote], categorías+tags, suscripciones, tendencias, push PWA)
- [2026-07-18 13:52] Usuario confirma pivote a movimientos itemizados (Transaction) con migración de actualAmount → movimiento inicial. Fase 2 dividida internamente en 2a (movimientos+dashboard) y 2b (categorías/tags, suscripciones, tendencias, push).
- [2026-07-18 15:XX] Fase 2a — primer intento falló por límite de sesión de API antes de tocar código (sin cambios parciales). Relanzada con éxito tras reset del límite (18:13 WEST).
- [2026-07-18] Agent: fullstack-developer — Fase 2a completa. Nueva entidad BudgetMovement, tabla budget_movements, migración drizzle/0004_opposite_darkhawk.sql (con backfill de actualAmount→movimiento inicial), DashboardTab con NetWorthCalculator. tsc/tests(331)/lint en verde. Aplicada a DB local; migración remota Turso NO aplicada (decisión deliberada del agente, pendiente de confirmación del usuario por ser dato de producción real). Pasando a review.
- [2026-07-18] Agent: code-reviewer — PASS. Migración 0004 analizada línea a línea: aditiva, no destructiva, sin riesgo de pérdida/duplicación. 4 warnings no bloqueantes (semántica actual_amount=0, columna actual_amount queda huérfana en null tras primer save, saveAll reescribe historial completo por guardado — deuda ya señalada en el plan, DashboardTab sin caso de uso propio). REVIEW-fase2a-movimientos-dashboard.md en review/. Pendiente: decisión del usuario sobre aplicar la migración a Turso remoto.
