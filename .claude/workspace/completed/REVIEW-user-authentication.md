# Review: Entidad Usuario y autenticación (Auth.js v5, multi-tenant `userId` scoping)

## Verdict: PASS

Cambio transversal grande, bien ejecutado. Los 8 puntos críticos de seguridad y las reglas
de arquitectura (hexagonal, class-first, code-semantic, testing) se cumplen. `tsc --noEmit`
limpio y `vitest run` en verde (189/189, 46 files).

## Blocking findings
- Ninguno.

## Warnings (non-blocking) — RESUELTOS 2026-07-12
- `src/features/auth/application/AuthenticateWithCredentials.ts` — **Fijado.** `UserRepository`
  gana `findCredentialsByEmail(email): Promise<{ user, passwordHash } | null>`, sustituyendo a
  `findByEmail`+`findPasswordHashByEmail` en paralelo (una sola query). El caso queda ademas
  cerrado contra el canal lateral de temporización: se llama siempre a `passwordHasher.verify`,
  usando un hash bcrypt dummy sin plaintext conocido (`UNMATCHABLE_PASSWORD_HASH`) cuando no hay
  credenciales reales (email desconocido, formato inválido o cuenta sin contraseña). Tests
  actualizados en `AuthenticateWithCredentials.unit.test.ts`, `RegisterUser.unit.test.ts` y
  `TursoUserRepository.integration.test.ts`.
- `src/features/wealth/infrastructure/TursoPositionTransactionRepository.ts` — **Fijado.**
  `save` pasa a `save(userId, transaction)` y valida la propiedad del `positionId` contra
  `positions.user_id` antes de insertar, lanzando `PositionNotOwnedByUserError` si no coincide.
  Puerto `PositionTransactionRepository.save` actualizado a la misma firma. Nuevo test de
  integración cubre el rechazo cross-user.
- `src/app/page.tsx:7-18` — **Fijado.** Banner de comentario descriptivo eliminado (code-semantic:
  no comments explicando qué hace el código).
- Deviation documentada (tablas `session`/`verificationToken` omitidas): coherente con
  `strategy: "jwt"` y sin proveedor de magic-link; el `DrizzleAdapter` sólo recibe `usersTable` y
  `accountsTable`. Correcto para el alcance actual. Nota: habilitar un provider de email/magic-link
  en el futuro exigirá reintroducir esas tablas.

## Positive points
- **IDOR cerrado**: las 4 Server Actions de guardado (`savePortfolio/saveDebts/saveBudget/saveGoalsSettings`)
  y `page.tsx` resuelven el `userId` en servidor vía `currentUserProvider.requireUserId()` /
  `auth()`; ninguna acepta `userId` del cliente. El `userId` viaja por `invoke()`, no por
  construcción, manteniendo los use cases como singletons.
- **Aislamiento real por usuario** en el SQL/Drizzle de todos los repos: `findAll`/`saveAll`/`save`
  acotan por `user_id`, y los `delete` dentro de `saveAll` van scoped por `user_id` (portfolio,
  debts, fixed expenses) o por los `monthId` del propio usuario (budget months → categories/events).
  El repo de transacciones filtra por `positions.user_id` vía `innerJoin`.
- **Cobertura de aislamiento explícita**: cada repo de negocio tiene test "isolated per user" y,
  además, "should not delete another user's rows when saving the current user's" — exactamente el
  riesgo del patrón delete+insert. `TursoPositionTransactionRepository` verifica que `user-2` no ve
  las transacciones de `user-1`.
- **Confinamiento de Auth.js impecable**: `src/features/auth/domain` y `.../application` sin
  `next-auth`/`@auth/*`/`bcryptjs`/`drizzle` (verificado por grep). El `authorize` de Credentials
  delega en el use case a través de `container`.
- **Edge safety**: `auth.config.ts` importa sólo `next-auth` + provider Google (sin adapter, sin
  bcrypt, sin libSQL); `middleware.ts` importa únicamente `auth.config`. Credentials + DrizzleAdapter
  viven sólo en `auth.ts` (runtime Node). Sin arrastres transitivos al edge.
- **Password handling correcto**: la entidad `User` no tiene campo de contraseña; nunca se devuelve
  ni loguea. Hashing bcryptjs (10 rondas) tras el puerto `PasswordHasher`; el hash sólo se lee
  internamente vía `findPasswordHashByEmail`.
- **Migración de reset coherente** con el plan: única migración fresh, FKs `ON DELETE cascade` a
  `user(id)`, y `goals_settings`/`budget_base` con `user_id` como PK sustituyendo a los ids
  singleton (eliminados por completo: grep de `*_SINGLETON_ID` = 0).
- **Class-first / code-semantic** respetados: use cases con `invoke()`, mappers y repos como clases,
  puertos en los límites. Las únicas funciones exportadas son la Server Action (patrón requerido por
  Next) y `LoginForm` (componente). Naming semántico (`requireUserId`, `EmailAlreadyRegisteredError`,
  `readCredentialAsString` privado no exportado).
- **e2e realista**: `global-setup.ts` autentica y reutiliza `storageState`; `login.e2e.spec.ts`
  cubre login correcto, credenciales inválidas y redirección de visitante no autenticado a `/login`.
