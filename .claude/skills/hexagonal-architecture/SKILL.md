---
name: hexagonal-architecture
description: >
  Hexagonal architecture for finance-manager, a full-stack Next.js + Turso (libSQL) app. Pure
  Domain with zero framework dependencies, Application use cases + ports (driving/driven),
  Infrastructure adapters (Turso/libSQL repositories, external APIs), Next.js Route Handlers and
  Server Actions as driving adapters, composition root in a DI container. Activate when designing
  modules, directories, interfaces, services, or data flows that touch architectural boundaries.
---

# Hexagonal Architecture

`finance-manager` is a single full-stack Next.js app — there is no separate backend service. The
project hasn't been scaffolded yet, so the folder layout below is a **starting proposal**, not a
contract: adjust it once `create-next-app` runs and real features start landing, but keep the
underlying principle — dependencies point **inward only**, and Next.js/Turso are infrastructure,
not the center of the app.

## Layers

```
Domain (pure logic, zero dependencies)
    ↑
Application (ports + use cases)
    ↑
Infrastructure (Turso/libSQL, external APIs, Route Handlers, Server Actions, React)
```

## Suggested Folder Layout

```
src/
├── domain/              # Entities, value objects, domain services — ZERO framework deps
├── application/
│   ├── use-cases/        # One class per use case, invoke() entry point
│   └── ports/
│       ├── driving/      # Primary ports consumed by Route Handlers/Server Actions
│       └── driven/       # Secondary ports: TransactionRepository, BudgetRepository, ...
├── infrastructure/
│   ├── db/                # Turso client, libSQL/Drizzle repositories implementing driven ports
│   └── external/          # Third-party API adapters (rates, market data, ...), if any
├── app/                  # Next.js App Router: pages, layouts, route handlers, server actions
├── components/           # Shared UI components
├── features/             # Feature modules (client hooks, mappers, feature-scoped UI)
├── store/                # Zustand client state
├── lib/
│   └── di/                # Composition root — wires ports to adapters
└── types/                 # Shared cross-feature types
```

Treat this as a reference shape. If early features don't justify the full split (e.g. a single
`Transaction` entity doesn't need a dedicated `ports/driving` folder yet), start simpler and grow
into it — don't scaffold empty layers speculatively (see `code-semantic` / YAGNI).

## The Dependency Rule

1. **Core isolation** — `domain/` never imports Next.js, React, the Turso/libSQL client, or an ORM.
2. **Application ports** — `application/` coordinates flows. It exposes incoming work via
   **driving ports** (use case interfaces) and reaches Turso or external APIs only through
   **driven ports** (repository/gateway interfaces).
3. **Infrastructure isolation** — `@libsql/client` (or Drizzle on top of it) and any third-party
   API client live in `infrastructure/` as adapters.
4. **Adapter-to-port boundaries** — Route Handlers and Server Actions (driving adapters) invoke
   primary ports through the composition root. Driven adapters (Turso repositories) implement
   secondary ports. Map between infrastructure rows and domain entities at these boundaries.
5. **Client Components never touch infrastructure** — they read data already fetched by a Server
   Component/Route Handler, or call a Server Action. They never import `infrastructure/` or query
   Turso directly.

```ts
// application declares the driven port it needs
export interface TransactionRepository {
  findByAccountId(accountId: string): Promise<Transaction[]>;
  save(transaction: Transaction): Promise<void>;
}

// infrastructure implements it against Turso, mapping to domain entities
export class TursoTransactionRepository implements TransactionRepository {
  constructor(private readonly client: Client) {}

  async findByAccountId(accountId: string): Promise<Transaction[]> {
    const result = await this.client.execute({
      sql: "select * from transactions where account_id = ?",
      args: [accountId],
    });
    return result.rows.map(toDomainTransaction);
  }
}

// Route Handler is a driving adapter — resolves the use case, never touches Turso directly
export async function GET(request: Request): Promise<Response> {
  const accountId = new URL(request.url).searchParams.get("accountId");
  const listTransactions = container.resolve("ListTransactionsUseCase");
  return Response.json(await listTransactions.invoke(accountId));
}
```

## Rules of Thumb

- Never import `@libsql/client`, Drizzle, Next.js or React from `domain/` or `application/`.
- Never query Turso directly from a component or a Route Handler — go through a use case.
- Each use case is a class with a single `invoke()` entry point (see `class-first-architecture`).
- Schema changes go through a migration — never hand-edit data in place of one.
- React Compiler is enabled — avoid manual `useMemo`/`useCallback` unless profiling proves it's needed.

## Composition Root

One place (e.g. `src/lib/di/ContainerDI.ts`) constructs infrastructure adapters (the Turso client,
repositories) and wires them into use cases. Route Handlers, Server Actions and Server Components
resolve dependencies from that root — they don't call `new TursoTransactionRepository(...)` themselves.
