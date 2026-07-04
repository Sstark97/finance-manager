---
name: clean-code
description: >
  finance-manager coding standards index. Routes to the full-stack TypeScript skills
  (hexagonal-architecture, class-first-architecture, code-semantic, testing). Activate when
  writing or reviewing code, or to find the right detailed skill.
---

# Clean Code — finance-manager Standards

Index of all coding standards. `finance-manager` is a single full-stack **TypeScript** app
(Next.js + Turso) — one set of conventions applies everywhere, from domain logic to UI.

| Skill | Covers |
|-------|--------|
| `hexagonal-architecture` | Layer isolation (domain/application/infrastructure), ports/adapters, dependency rule, composition root |
| `class-first-architecture` | Named classes over loose functions, interfaces at boundaries, use cases with `invoke()` |
| `code-semantic` | Semantic naming, KISS/YAGNI, SOLID, Law of Demeter, no comments |
| `testing` | Vitest + React Testing Library, naming, fixtures, port-boundary mocking, Turso integration tests |

## Checklist Before Committing

- [ ] `strict` TypeScript; no `any`, no `@ts-ignore`; explicit return types on public functions
- [ ] `??` instead of `||` for nullish coalescing
- [ ] `domain/` has zero framework imports (no Next.js, React, Turso/libSQL, Drizzle)
- [ ] Named classes for feature logic; boundaries behind interfaces; construction in the composition root
- [ ] Semantic names: no abbreviations, `catch (error)`, descriptive loop counters
- [ ] No comments — self-documenting code
- [ ] No `useEffect` to derive state
- [ ] Co-located `*.unit.test.ts(x)`; RTL queries by semantic role; mock ports only
- [ ] `npm run lint` and `npm run test` pass

## Quick Reference

| Aspect | Do | Don't |
|--------|-----|-------|
| Error handling | typed errors / `Result`-like return where it clarifies a use case | throwing for expected, recoverable business outcomes |
| Boundaries | interfaces/ports, consumed via the composition root | importing the concrete adapter (Turso client, HTTP client) directly |
| Use cases | class + `invoke()` | free function named `execute`/`run`/`handle` |
| Fields | `private readonly amount: Money;` | `private _amount: Money;` |
| Variables | `checkingAccount`, `overdrawnAccount` | `account1`, `accountA` |
| Mapping | dedicated mapper class | ad-hoc inline reshaping scattered across callers |
| Tests | `describe("ClassName")` / `it("should ... when ...")`, mock at the port | asserting on implementation details, mocking domain objects |
