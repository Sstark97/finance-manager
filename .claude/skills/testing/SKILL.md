---
name: testing
description: >
  Testing conventions for finance-manager (TypeScript, Next.js + Turso). Vitest + React Testing
  Library, semantic role queries, co-located unit tests, Turso integration tests against a real
  local libSQL file, Zustand store tests. Activate when writing, reviewing, or refactoring any test.
---

# Testing Conventions

Tests are **executable specifications** — the reader understands behavior without reading the
implementation.

## Shared Rules

- One behavior per test.
- Mock at the **port/boundary** (repositories, gateways, HTTP clients). Never mock domain entities or value objects — instantiate them as real.
- No magic inline data — derive expected values from the inputs you built.
- Test only observable business behavior.

## Organization

- Unit tests co-located with source: `Foo.unit.test.ts` / `Foo.unit.test.tsx` in the same directory.
- Integration tests: `Foo.integration.test.ts`.
- The test structure mirrors `src/`.

## Naming as Specification

```ts
describe("TransactionFiltersMapper", () => {
  it("should ignore an empty query when parsing filters", () => {
    // ...
  });
});
```

The reader must understand the behavior without reading the implementation.

## Unit Tests

- Use cases: mock the driven ports (repositories, gateways) with `vi.fn()` or mock classes.
- Domain value objects and entities: no mocks — they are pure logic, instantiate them for real.
- Domain services: no mocks.

## Integration Tests (Turso Repositories)

- Point `@libsql/client` at a local libSQL file (`file:./test.db`) or `:memory:` — never mock the Turso client in an integration test.
- Apply migrations before the suite runs; seed rows in `beforeEach`, clean up in `afterEach`.
- Assert against the domain shape returned by the repository, not raw SQL rows.

## Component Tests (`*.unit.test.tsx`)

- Use React Testing Library — not `enzyme`, not CSS class selection.
- Query hierarchy: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`.
- Mock fetch/use cases — components do not call Turso or Route Handlers for real in tests.

```tsx
// CORRECT — semantic role query, one behavior
it("should show the overdrawn badge when the account balance is negative", () => {
  render(<AccountCard account={overdrawnAccount} />);

  expect(screen.getByRole("status", { name: /overdrawn/i })).toBeInTheDocument();
});

// WRONG — querying by implementation detail
expect(container.querySelector(".badge--overdrawn")).toBeTruthy();
```

## Zustand Store Tests

- Import the store directly, set initial state, trigger actions, assert the result.
- No UI rendering in store tests.

## Test Data

- Create explicit factories or fixtures in `__fixtures__/` — do not use magic inline data.
- Domain fixtures are built through real entity/value object constructors.

## Checklist

- [ ] Co-located `*.unit.test.ts(x)`, mirrors `src/`
- [ ] `describe("ClassName")` + `it("should [behavior] when [condition]")`
- [ ] Mock outgoing ports only; domain is real
- [ ] Turso integration tests use a real local libSQL file, never a mocked client
- [ ] Component tests query by semantic role, never by CSS class
- [ ] Fixtures in `__fixtures__/`, built through real constructors
- [ ] One behavior per `it`
- [ ] Never use `any` in tests
