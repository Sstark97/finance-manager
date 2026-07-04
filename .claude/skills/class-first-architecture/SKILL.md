---
name: class-first-architecture
description: >
  Class-first, interface-driven design for finance-manager (TypeScript, full-stack Next.js +
  Turso). Named classes over loose utility functions, interfaces at module boundaries, use cases
  as classes with an invoke() entry point, composition-root ownership. Activate when creating or
  refactoring features, services, mappers, adapters, repositories, or cross-file logic.
---

# Class-First, Interface-Driven Design

Core behavior lives in **named classes with explicit, intent-revealing methods** — never in loose
script-style utility functions. Dependencies crossing module boundaries are expressed as
**interfaces/ports**, and object construction happens only in the **composition root**.

## Principles

1. **No script-style feature logic** — prefer named classes with methods that describe intent over loose exported functions.
2. **Interface first for boundaries** — any dependency crossing domain/application/infrastructure exposes a port and is consumed through it.
3. **Composition root ownership** — construction (`new`) happens in the composition root, not deep in leaf components or generic helpers.
4. **Encapsulation over function clusters** — group related behavior and invariants inside one class (mappers/parsers/normalizers) instead of spreading logic across free functions.
5. **Naming discipline** — class and method names express behavior and business intent (`BudgetOverspendDetector.detect`), not technical shortcuts.
6. **Incremental pragmatism** — introduce abstractions only where they protect boundaries, readability and testability. Avoid speculative hierarchy — a single-file feature doesn't need a port yet if nothing else implements or mocks it.

## Use Cases

One class per use case, a single `invoke()` entry point.

```ts
export interface ListTransactionsUseCase {
  invoke(accountId: string): Promise<Transaction[]>;
}

export class ListTransactions implements ListTransactionsUseCase {
  constructor(private readonly transactions: TransactionRepository) {}

  async invoke(accountId: string): Promise<Transaction[]> {
    return this.transactions.findByAccountId(accountId);
  }
}
```

## Mappers as Classes

```ts
// WRONG — loose feature logic spread across free functions
export function parseFilters(raw: URLSearchParams) { /* ... */ }
export function normalizeFilters(filters: Filters) { /* ... */ }

// CORRECT — encapsulated in a named class, behavior-revealing methods
export class TransactionFiltersMapper {
  parse(rawQuery: URLSearchParams): TransactionFilters { /* ... */ }
  toQueryString(filters: TransactionFilters): string { /* ... */ }
}
```

## Boundaries as Ports

```ts
export interface TransactionRepository {
  findByAccountId(accountId: string): Promise<Transaction[]>;
  save(transaction: Transaction): Promise<void>;
}

// Composition root owns construction
container.register("TransactionRepository", () => new TursoTransactionRepository(tursoClient));
```

- Boundaries (Turso repositories, HTTP/external API clients) expose an interface/port; callers depend on the port, not the concrete class.
- `new` happens in the composition root, not inside leaf components.
- Tiny pure local helpers are acceptable only when private to one file and not exported as shared feature API.
