---
name: code-semantic
description: >
  Code semantics, expressiveness and naming for finance-manager (TypeScript). Semantic names,
  prose-like readability, KISS/YAGNI, SOLID/DRY, Law of Demeter, no comments, no abbreviations,
  catch(error), descriptive loop counters, self-documenting tests. Activate when creating, editing,
  or refactoring any source or test.
---

# Code Semantics, Expressiveness and Clean Design

Code reads like prose. Names express **business intent**, not technical shortcuts.

## Standards

1. **Semantic naming & prose-like readability** — avoid cryptic or shortened names. `isBudgetExceeded`, not `chkBudg`. Statements read almost like human phrases.
2. **Simplicity over complexity (KISS & YAGNI)** — prefer the most compact, simple solution. No speculative abstract factories or features unless required by the current task.
3. **Extract for meaning & raise the abstraction level** — if an inline condition or block takes more than a glance, extract it into a named local, method, or helper. A function body reads like a table of contents, not the full book.
4. **Strict principles (SOLID & DRY)** — single responsibility; abstract shared behavior, but never couple unrelated modules just to save lines.
5. **Law of Demeter** — talk only to immediate friends. Forbid deep chains like `account.owner.address.city`. Use encapsulation or orchestration instead.
6. **No comments in production code** — code is self-documenting via semantic names. If a comment feels necessary, extract the expression into a named local/method instead. The only justified comment is one explaining a non-obvious *why* (a workaround, an external constraint) that the code itself can't express.
7. **Self-documenting tests** — tests read like executable specifications (see `testing`).

```ts
// Extract compound guards into a named concept
const isAccountOverdrawn = account.balance() < 0;
const isEligibleForAutoSave = transaction.amount() >= autoSaveThreshold;
```

## Naming Conventions

- **No single-letter or abbreviated variables** — never `i`, `j`, `e`, `p`, `v`. Use `transactionIndex`, `error`, `account`, `amount`.
- **No framework shorthand** — `request`/`response`, not `req`/`res`; `error`, not `err`. Unused params get a leading underscore: `_request`, `_nextMiddleware`.
- **Descriptive loop counters** — `for (const [transactionIndex, transaction] of transactions.entries())`, never `for (let i = 0; ...)`.
- **Catch parameters** — always `catch (error)`, never `catch (err)` or `catch (e)`.
- **No numbers or abstract suffixes in variable names** — never `account1`, `accountA`; use `checkingAccount`, `savingsAccount`.

```ts
// WRONG
transactions.forEach((t, i) => { try { /* ... */ } catch (e) { log(e); } });

// CORRECT
transactions.forEach((transaction, transactionIndex) => {
  try {
    /* ... */
  } catch (error) {
    logger.error(error);
  }
});
```
