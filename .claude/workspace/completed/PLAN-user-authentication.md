# Plan: Entidad Usuario y autenticación (Auth.js v5) con datos multiusuario

## Goal
Introducir la entidad `User` y un sistema de autenticación (email+contraseña y Google OAuth) de forma
que la app deje de ser mono-usuario: hoy todas las entidades son globales (tablas sin dueño y filas
"singleton" con `id = "default"`). El objetivo es que cada usuario, tras iniciar sesión, vea y edite
únicamente **sus** datos (cartera/wealth, presupuesto/budget, metas/goals, deudas/debts), filtrando
todo por `userId` en repositorios y use cases, y protegiendo las rutas con middleware.

Se adopta **Auth.js (NextAuth v5)** por su integración nativa con el App Router, sus route handlers
`[...nextauth]`, el patrón de middleware edge-safe y el `@auth/drizzle-adapter`, que encaja con el
stack Drizzle + libSQL ya presente. Auth.js queda confinado a la capa de infraestructura (adaptador
conductor); el dominio permanece puro.

## Affected layers
[x] domain  [x] application  [x] infrastructure  [x] UI

## Contexto real del código (hallazgos que condicionan el plan)

- **No existe `CLAUDE.md` en el repo**; la arquitectura real es *feature-based* (`src/features/{wealth,budget,goals}` + `src/shared` para debts), no la carpeta `domain/application/infrastructure` de nivel raíz que sugiere el skill. El plan sigue la convención real.
- **La app es hoy mono-usuario**:
  - Tablas de lista sin dueño: `positions`, `position_transactions`, `debts`, `budget_months`, `budget_month_categories`, `budget_events`, `fixed_expense_items`.
  - Filas singleton con `id = "default"`: `goals_settings` (`GOALS_SETTINGS_SINGLETON_ID`) y `budget_base` (`BUDGET_BASE_SINGLETON_ID`).
  - Los `invoke()` de los use cases y los métodos de repositorio **no reciben `userId`** (`LoadDebts.invoke(): Promise<Debt[]>`, `PortfolioRepository.findAll()`, etc.).
- **Composition root** único en `src/lib/di/ContainerDI.ts` (`export const container`). Route Handlers y Server Actions resuelven desde ahí; nadie hace `new TursoXRepository` fuera.
- **Persistencia**: `src/infrastructure/db/schema.ts` (Drizzle sqlite-core) + migraciones en `drizzle/` (una sola, `0000_jazzy_rhino.sql`). Cliente en `src/infrastructure/db/client.ts` (`TursoClientFactory`).
- **No hay entorno de producción real con datos**: `.env.example` deja `TURSO_DATABASE_URL` **opcional**; sin ella, `dev` cae a un SQLite local en `tmpdir()` (`scripts/setup-local-dev-db.mjs`), y el e2e usa otro SQLite en `tmpdir()` recreado en cada corrida (`e2e/setup/prepare-database.mjs`, `playwright.config.ts`). Las BBDD de desarrollo son **efímeras y regenerables**. => Se puede tratar la introducción de `user_id` como un **reset de esquema** (migración destructiva-aceptable), sin backfill de datos.
- **Sembrado (seeding)**: `src/app/page.tsx` + `LoadInitialAppState` siembran datos demo globales la primera vez (`data/*.ts`). Ya existe manejo de *empty states* de usuario nuevo (commit `e0220a5`). Con multiusuario, el seed global deja de tener sentido: los usuarios nuevos arrancan vacíos.
- **Patrón "singleton" y "saveAll"**: los repos de lista hacen `delete(tabla)` + `insert` en transacción (p.ej. `TursoPortfolioRepository.saveAll`); habrá que acotar el `delete`/`select` por `user_id`.
- **e2e actual entra directo a `/`** sin login. Con protección de rutas, deberá autenticarse primero (impacto documentado abajo).

## Decisión de arquitectura: dónde vive Auth.js

Auth.js es framework/infra, no dominio. Reparto por capas:

- **Domain (`src/features/auth/domain/`)** — puro, sin dependencias de Auth.js ni Drizzle:
  - `User` (entidad): `id`, `email`, `displayName`, `avatarUrl?`. Sin contraseña en claro.
  - `Email` (value object) que valida formato y normaliza (lowercase/trim).
  - Opcional `HashedPassword` como VO fino si aporta claridad; si no, se maneja como `string` en el puerto (YAGNI).
- **Application (`src/features/auth/application/`)** — puertos + use cases:
  - Puerto driven `UserRepository`: `findByEmail(email)`, `findById(id)`, `create(user, passwordHash?)`.
  - Puerto driven `PasswordHasher`: `hash(plain)`, `verify(plain, hash)`.
  - Use case `RegisterUser` (alta con email+contraseña) — clase con `invoke()`.
  - Use case `AuthenticateWithCredentials` (login email+contraseña) — `invoke(email, password): Promise<User | null>`.
- **Infrastructure**:
  - `TursoUserRepository` + `UserRowMapper` (implementan el puerto contra la tabla `users`).
  - `BcryptPasswordHasher` (implementa `PasswordHasher` con `bcryptjs`).
  - Config de Auth.js en `src/infrastructure/auth/` (adaptador conductor): declara providers, `DrizzleAdapter`, callbacks; su `authorize` de Credentials **delega en el use case** vía `container`.
- **Driving adapters (Next.js)**: route handler `[...nextauth]`, `middleware.ts`, páginas `/login` y Server Actions de registro/login/logout.

Regla clave respetada: el dominio y la aplicación **no importan** `next-auth`, `@auth/*`, `bcryptjs` ni Drizzle. Auth.js solo aparece en `src/infrastructure/auth/` y en los adaptadores de `src/app`.

## Files to create/modify

### Dependencias (`package.json`)
- Añadir `next-auth@beta` (v5), `@auth/drizzle-adapter`, `bcryptjs` y `@types/bcryptjs` (dev). — nuevas deps de infraestructura.

### Domain (nuevo) — `src/features/auth/domain/`
- `User.ts` — entidad de usuario (sin secretos).
- `Email.ts` — value object con validación/normalización (+ `Email.unit.test.ts`).
- `types.ts` — tipos compartidos del feature si hacen falta.

### Application (nuevo) — `src/features/auth/application/`
- `UserRepository.ts` — puerto driven.
- `PasswordHasher.ts` — puerto driven.
- `RegisterUser.ts` — use case (+ `RegisterUser.unit.test.ts`).
- `AuthenticateWithCredentials.ts` — use case (+ `AuthenticateWithCredentials.unit.test.ts`).

### Infrastructure (nuevo) — `src/features/auth/infrastructure/`
- `TursoUserRepository.ts` (+ `TursoUserRepository.integration.test.ts`).
- `UserRowMapper.ts` (+ `UserRowMapper.unit.test.ts`).
- `BcryptPasswordHasher.ts` (+ `BcryptPasswordHasher.unit.test.ts`).

### Infrastructure (nuevo) — `src/infrastructure/auth/`
- `auth.config.ts` — configuración **edge-safe** (sin adapter, sin bcrypt): `pages.signIn = "/login"`, provider Google, y callback `authorized` para el middleware. Importable desde el edge.
- `auth.ts` — `NextAuth(...)` completo (runtime Node): extiende `auth.config`, añade `DrizzleAdapter(container.database(), { ...tablas })`, el provider **Credentials** cuyo `authorize` llama a `container.authenticateWithCredentials().invoke(...)`, `session.strategy = "jwt"` y callbacks `jwt`/`session` para propagar `user.id`. Exporta `{ handlers, auth, signIn, signOut }`.
- `CurrentUserProvider.ts` — helper/adaptador que resuelve el `userId` de la sesión (`await auth()`), reutilizable por Server Components/Actions/Route Handlers. Lanza/redirige si no hay sesión.

### Infrastructure (modificar) — persistencia
- `src/infrastructure/db/schema.ts`:
  - Añadir tablas de Auth.js para SQLite: `users`, `accounts`, `sessions`, `verificationTokens` (esquema estándar del `@auth/drizzle-adapter` sqlite, verificado contra `packages/adapter-drizzle/src/lib/sqlite.ts` del repo `nextauthjs/next-auth`):
    - `user`: `id` (text PK, default UUID), `name` (text, nullable), `email` (text, unique, nullable), `emailVerified` (integer timestamp_ms, nullable), `image` (text, nullable).
    - `account`: `userId` (text, FK → user.id, cascade), `type`, `provider`, `providerAccountId` (text, requeridos), `refresh_token`/`access_token`/`id_token`/`token_type`/`scope`/`session_state` (text, nullable), `expires_at` (integer, nullable); PK compuesta `(provider, providerAccountId)`.
    - `session`: `sessionToken` (text PK), `userId` (text, FK → user.id, cascade), `expires` (integer timestamp_ms, requerido). **Necesaria igualmente** aunque la sesión sea JWT, porque el `DrizzleAdapter` la usa para el flujo de Google (linking de cuentas) y Auth.js la instancia por defecto en el adapter.
    - `verificationToken`: `identifier`, `token`, `expires` (integer timestamp_ms); PK compuesta `(identifier, token)`. Solo necesaria si se habilita un provider de Magic Link — no aplica a este alcance (email+contraseña y Google), pero el `DrizzleAdapter` la exige como parte de la config; se puede omitir si no se usa (`verificationTokensTable` es opcional según la doc oficial).
  - `sessionsTable` es opcional solo si se usa estrategia `"database"`; con `strategy:"jwt"` no es estrictamente necesaria para el ciclo de sesión en sí, pero Auth.js igualmente la requiere en el `DrizzleAdapter` si se pasa `sessionsTable` — se puede omitir del adapter config si no se usa. Decidir en implementación si se incluye por consistencia con el esquema estándar o se omite (YAGNI); si se omite, no crear la tabla `session`.
  - Añadir columna `userId` (`text("user_id").notNull().references(() => users.id)`) a: `positions`, `debts`, `budget_base`, `fixed_expense_items`, `budget_months`, `goals_settings`. Las tablas hijas (`position_transactions`, `budget_month_categories`, `budget_events`) heredan el dueño vía su padre; se filtra por join/subconsulta al padre (evitar desnormalizar salvo que simplifique).
  - `goals_settings` y `budget_base` dejan de usar PK `"default"`: la unicidad pasa a ser por `userId` (PK o índice único sobre `user_id`).
- `drizzle/0001_*.sql` — nueva migración generada con `drizzle-kit generate` (ver nota de reset abajo).

### Infrastructure (modificar) — repositorios y mappers (acotar por `userId`)
- `src/features/wealth/infrastructure/TursoPortfolioRepository.ts` — `findAll(userId)`, `saveAll(userId, positions)` (delete/insert acotado por `user_id`).
- `src/features/wealth/infrastructure/TursoPositionTransactionRepository.ts` — acotar por dueño (join a `positions.user_id`).
- `src/shared/infrastructure/TursoDebtRepository.ts` — `findAll(userId)`, `saveAll(userId, debts)`.
- `src/features/budget/infrastructure/TursoBudgetRepository.ts`, `TursoMonthRepository.ts`, `TursoBudgetTransactionRunner.ts` — acotar por `user_id`.
- `src/features/goals/infrastructure/TursoGoalsSettingsRepository.ts` — `find(userId)`/`save(userId, settings)` usando `user_id` en vez de `GOALS_SETTINGS_SINGLETON_ID`.
- Mappers afectados por el id singleton: `GoalsSettingsRowMapper.ts`, `BudgetBaseRowMapper.ts` — `toRow(settings, userId)`; eliminar/relegar las constantes `*_SINGLETON_ID`.

### Application (modificar) — use cases con `userId`
- `src/features/wealth/application/{LoadPortfolio,SavePortfolio}.ts` + sus puertos `PortfolioRepository.ts`, `PositionTransactionRepository.ts`.
- `src/shared/application/{LoadDebts,SaveDebts}.ts` + `DebtRepository.ts`.
- `src/features/budget/application/{LoadBudget,SaveBudget}.ts` + `BudgetRepository.ts`, `MonthRepository.ts`, `BudgetTransactionRunner.ts`.
- `src/features/goals/application/{LoadGoalsSettings,SaveGoalsSettings}.ts` + `GoalsSettingsRepository.ts`.
  - Todos: `invoke(userId, ...)` y firma de puertos `findAll(userId)`, `save(userId, ...)`.

### Composition root (modificar)
- `src/lib/di/ContainerDI.ts`:
  - Exponer `database()` (o un getter público) para que el `DrizzleAdapter` lo reutilice (misma instancia cacheada).
  - Registrar `userRepository`, `passwordHasher`, `registerUser`, `authenticateWithCredentials`.
  - Los getters existentes de use cases no cambian de forma (siguen devolviendo la instancia); el `userId` viaja por `invoke()`, no por construcción.

### Driving adapters (Next.js)
- `src/app/api/auth/[...nextauth]/route.ts` (nuevo) — `export const { GET, POST } = handlers`.
- `src/middleware.ts` (nuevo) — protege todo salvo `/login`, `/api/auth/*`, assets; redirige a `/login` si no hay sesión. Usa `auth.config.ts` (edge-safe).
- `src/app/login/page.tsx` (nuevo) — página pública de login/registro.
- `src/features/auth/components/LoginForm.tsx` (nuevo, client) — formulario email+contraseña + botón "Entrar con Google" (+ `LoginForm.unit.test.tsx`).
- `src/app/actions/registerUser.ts` (nuevo, `"use server"`) — llama `container.registerUser().invoke(...)`.
- `src/app/actions/authSession.ts` (nuevo) — server actions `signInWithCredentials`, `signInWithGoogle`, `signOut` que envuelven las funciones de `auth.ts`.
- `src/app/page.tsx` (modificar) — resolver `userId` con `CurrentUserProvider` (o `await auth()`), pasarlo a los `invoke()`; eliminar el seed demo global.
- `src/app/LoadInitialAppState.ts` (modificar) — recibir `userId`; **quitar el sembrado global** (los usuarios nuevos arrancan vacíos, apoyándose en los empty states ya existentes). Alternativa a valorar: seed opcional por-usuario en el registro; por defecto, sin seed.
- Las 4 Server Actions de guardado (`src/app/actions/{savePortfolio,saveDebts,saveBudget,saveGoalsSettings}.ts`) — resolver `userId` de la sesión y pasarlo al `invoke()`. **Nunca** aceptar `userId` desde el cliente.
- `src/app/layout.tsx` (modificar) — `metadata.title` y, si procede, envolver con proveedor de sesión (en v5 no es imprescindible en server components).

### Infra de arranque/tests (modificar)
- `scripts/setup-local-dev-db.mjs` — sigue migrando; documentar que hay que borrar el `local.db` viejo una vez (o el script puede recrearlo) por el reset de esquema.
- `e2e/setup/prepare-database.mjs` / `playwright.config.ts` — sembrar un **usuario de test** (hash bcrypt) tras migrar, para poder autenticar en e2e.
- `.env.example` — añadir `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (y `NEXTAUTH_URL`/`AUTH_URL` si aplica).

## Implementation steps
1. **Dependencias**: instalar `next-auth@beta`, `@auth/drizzle-adapter`, `bcryptjs`, `@types/bcryptjs`.
2. **Dominio auth**: crear `User`, `Email` (VO) y sus tests. Sin dependencias externas.
3. **Puertos + use cases auth**: `UserRepository`, `PasswordHasher`, `RegisterUser`, `AuthenticateWithCredentials` (con tests unitarios mockeando puertos).
4. **Schema**: añadir tablas Auth.js (`users/accounts/sessions/verificationTokens`) y columnas `user_id` a las tablas de negocio; sustituir PK singleton por unicidad por `userId` en `goals_settings` y `budget_base`.
5. **Migración**: `pnpm db:generate` para producir `drizzle/0001_*.sql`. Como las BBDD dev/e2e son efímeras, aplicar como **reset** (fresh migrate). Documentar el borrado del `local.db` de desarrollo.
6. **Infra auth**: `BcryptPasswordHasher`, `UserRowMapper`, `TursoUserRepository` (+ tests). Luego `auth.config.ts` (edge-safe, Google) y `auth.ts` (Node: DrizzleAdapter + Credentials cuyo `authorize` usa el use case, `strategy:"jwt"`, callbacks `jwt`/`session` con `user.id`).
7. **Composition root**: exponer `database()`, registrar repos/hasher/use cases de auth.
8. **Adaptadores Next**: route handler `[...nextauth]`, `middleware.ts`, `CurrentUserProvider`, `/login` + `LoginForm`, actions de registro/login/logout.
9. **Propagar `userId`**: refactor de puertos, use cases, repos y mappers de wealth/budget/goals/debts para recibir/filtrar por `userId`; actualizar `page.tsx`, `LoadInitialAppState` y las 4 actions de guardado para resolver el `userId` de sesión.
10. **Quitar seed global**; validar empty states de usuario nuevo.
11. **Tests**: actualizar los tests existentes de use cases/repos para pasar `userId`; añadir integración de `TursoUserRepository`; e2e de login por credenciales.
12. **Env**: actualizar `.env.example` y añadir `AUTH_SECRET`/credenciales Google.

## Testing strategy
- **Unit (dominio/aplicación)**:
  - `Email` VO: normalización y rechazo de formatos inválidos.
  - `RegisterUser`: hashea la contraseña (mock `PasswordHasher`), rechaza email duplicado (mock `UserRepository.findByEmail`), persiste vía `create`.
  - `AuthenticateWithCredentials`: devuelve `User` con hash válido, `null` con contraseña incorrecta o usuario inexistente. Mock de ambos puertos; dominio real.
  - Mappers `GoalsSettingsRowMapper`/`BudgetBaseRowMapper`: `toRow` incluye `userId` y ya no el id "default".
- **Integration (Turso, libSQL local real vía `TestDatabaseFactory`)**:
  - `TursoUserRepository`: create/findByEmail/findById con unicidad de email.
  - Repos de negocio: `saveAll`/`findAll` **aislados por `userId`** — un usuario no ve datos de otro (test explícito de aislamiento con dos userIds).
  - `BcryptPasswordHasher`: `verify(plain, hash(plain))` true; contraseña distinta false (puede ir como unit con bcrypt real, rondas bajas).
- **Component (RTL)**: `LoginForm` — envía credenciales por rol semántico, muestra error de credenciales inválidas, dispara sign-in de Google. Mockear las server actions/`signIn`.
- **e2e (Playwright)**:
  - Flujo credenciales: usuario de test sembrado en `prepare-database.mjs` → `/login` → entra → ve su tab. Reutilizar `storageState` autenticado para no repetir login en cada spec.
  - **Actualizar los e2e existentes** (`wealth`, `budget`, `goals`): hoy entran a `/` directo; ahora deben partir de estado autenticado.
  - Google OAuth **no** se prueba en e2e (depende de terceros); cubrir solo su cableado con tests de configuración/unit.

## Architecture decisions
- **Auth.js confinado a infraestructura**: el dominio (`User`, `Email`) y la aplicación (puertos + use cases) no conocen NextAuth. El `authorize` de Credentials es un adaptador conductor que delega en `AuthenticateWithCredentials`. Cumple la regla de dependencias hacia dentro.
- **Sesión JWT (`strategy:"jwt"`)**: el provider **Credentials** de Auth.js no persiste sesión vía adapter; obliga a estrategia JWT. El `DrizzleAdapter` sigue gestionando `users`/`accounts` (necesarios para Google y para el repositorio de usuarios). `user.id` se propaga a `session` mediante callbacks `jwt`/`session`.
- **Config partida edge/Node (`auth.config.ts` + `auth.ts`)**: el `middleware.ts` corre en el edge y no puede usar `bcryptjs` ni el cliente libSQL; por eso Credentials + adapter viven solo en `auth.ts` (Node), y el middleware importa la parte edge-safe. Patrón oficial de Auth.js v5.
- **`userId` por parámetro de `invoke()`**, no por construcción de use case: mantiene los use cases como singletons en el `ContainerDI` (como hoy) y evita instanciar por request. El `userId` **siempre** se resuelve en el servidor desde la sesión; nunca llega desde el cliente (evita IDOR).
- **`userId` como FK a `users.id`** en tablas de negocio; unicidad por `userId` sustituye a los ids singleton `"default"`. Las tablas hijas se filtran por su padre (Law of Demeter / evitar desnormalizar).
- **Reset de esquema en vez de backfill**: al ser dev/e2e efímeros y sin producción real, la migración `0001` puede introducir `user_id NOT NULL` sin backfill. Se documenta el borrado del `local.db` de desarrollo (el e2e ya se recrea).
- **Usuarios nuevos vacíos**: se elimina el seed demo global (artefacto mono-usuario) y se apoya en los empty states ya implementados. Un seed por-usuario queda como opción futura (YAGNI).
- **Feature `auth` propio** (`src/features/auth/…`) siguiendo la convención feature-based real del repo, no la carpeta raíz del skill (que no se usa).

## Risks and dependencies
- **Refactor transversal amplio**: tocar los `invoke()`/puertos/repos de las 4 áreas rompe compilación y **todos** sus tests hasta completarse. Orden recomendado: (1) auth de punta a punta, (2) migrar un vertical (p.ej. debts) por completo con sus tests, (3) replicar en wealth/budget/goals. Mantener el árbol compilable por vertical.
- **Credentials + adapter y estrategia JWT**: si se deja `strategy` por defecto (database) con Credentials, el login "no persiste" sesión. Forzar `strategy:"jwt"` y verificar callbacks.
- **Edge runtime del middleware**: cualquier import transitorio de `bcryptjs`/`@libsql/client` desde `auth.config.ts` rompe el build del middleware. Aislar estrictamente.
- **Account linking Google vs credenciales** con el mismo email: por defecto Auth.js bloquea el enlace automático. Decisión a documentar en implementación (mostrar error "usa tu método original" o habilitar linking verificado); no habilitar `allowDangerousEmailAccountLinking` sin verificación de email.
- **Google OAuth requiere credenciales reales** (`AUTH_GOOGLE_ID/SECRET`) y URL de callback registrada; el flujo no es testeable en local sin configurarlas. El desarrollo puede avanzar solo con Credentials si faltan.
- **e2e existentes se romperán** al activar el middleware (entran a `/` sin sesión). Deben migrar a estado autenticado (usuario sembrado + `storageState`) en la misma entrega.
- **`AUTH_SECRET` obligatorio**: sin él, Auth.js falla en producción; añadir a `.env.example` y documentar generación.
- **`bcryptjs` (JS puro) vs `bcrypt` (nativo)**: se elige `bcryptjs` para evitar binarios nativos en el entorno serverless de Next; coste CPU mayor pero aceptable y compatible con el runtime Node del route handler.
</content>
</invoke>
