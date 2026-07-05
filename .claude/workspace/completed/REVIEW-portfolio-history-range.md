# Review: Portfolio evolution range selector (reconstructed history)

## Verdict: PASS

All blocking items (TypeScript strictness, hexagonal boundaries, class-first design, semantic naming, tests) are satisfied. `npx tsc --noEmit` reports no errors; the wealth suite runs 59 passing tests (75 after the follow-up fix below).

## Verification of the flagged risk areas

1. **`PortfolioHistoryCalculator` correctness** — Correct. Master axis is the sorted unique union of bucket keys over `historyByTicker` only (FX is aligned onto that axis, not contributing keys — matches the plan). Forward-fill via binary search, back-fill via `earliestCloseOf`, FX per bucket (`units × close × rateAt`), cash added once per bucket, and the failed-ticker fallback (`units × position.price`) are all implemented as specified. No NaN path exists: histories placed in the map always carry ≥1 point (the gateway guarantees it), `earliestCloseOf` defensively returns `0` for an empty list, and a missing FX series degrades to a constant rate of 1.

2. **`HistoryBucketer` timezone arithmetic** — Correct, not just plausible. `floor((timestamp + gmtOffsetSeconds) / 86400) * 86400` resolves an LSE bar (07:00 UTC, offset 3600) and a UTC crypto bar on the same calendar day to the identical key, and `labelFor` rendered with `timeZone: "UTC"` reproduces the correct local calendar date. Confirmed by `HistoryBucketer.unit.test.ts` (LSE-vs-crypto convergence, offset pushing a 23:30 bar into the next local day).

3. **`/api/prices/history` route** — Meets the hard requirement and is actually *stricter* than the sibling `/api/prices`: 400 on a non-array `positions`, 400 on an invalid `range` (closed-set check), a generic Spanish 502 message in `catch` with no `error.message` leaked and no debug logging.

4. **Caching decorator** — Key `ticker|range` cannot collide in practice: Yahoo symbols never contain `|` and `range` is a closed enum. TTL (6h default) and the "refetch only stale/missing pairs, per-range" logic are correct and covered by tests.

5. **Boundaries** — Clean. `AssetPriceHistoryGateway` is a separate driven port (ISP). Domain imports only domain types; application imports domain + port; adapters live in infrastructure; the route resolves the use case through the container. Every `new` is in `src/lib/di/container.ts`.

6. **Test quality** — `PortfolioHistoryCalculator.unit.test.ts` genuinely exercises staggered/missing dates across instruments, per-bucket FX with different rates on different days, the cash constant, the single-point fund flat-line, the unresolved-ticker constant, and the empty-map case.

## Warnings (non-blocking)

- All-cash/all-failed-tickers portfolio → `masterAxis` empty → `[]` returned (per plan's stated contract; won't trigger for current portfolio).
- `HistoryBucketer.intradayLabelFor` uses `toLocaleTimeString("es-ES", …)` without `timeZone: "UTC"`, unlike the daily label's explicit UTC anchoring — fine on a UTC host, inconsistent with the daily path.
- A few "what" doc-comments on interface fields (`AssetPriceHistory.ts`, `PortfolioHistoryCalculator.ts`) — most justified (unit/basis/invariant clarifications), a couple redundant with field names.
- `CachingAssetPriceHistoryGateway`: a duplicate ticker in the input array that's fresh in cache would be emitted twice — only reachable if two positions share a ticker, harmless.

## Post-review follow-up (applied, not re-reviewed)

User asked whether liquidity (cash) is included in the reconstructed history's gain/return metrics. Confirmed: `cashTotal` is added as a constant to every bucket, so the absolute € `change` was already cash-neutral (constant cancels in the subtraction), but `changePercent`'s denominator (`firstHistoryTotal`) included cash (~30% of net worth), diluting the displayed return. User chose to base the percentage on invested-only value. Fix applied directly in `WealthTab.tsx`:

```ts
const firstInvestedTotal = firstHistoryTotal - liquidityTotal;
const changePercent = firstInvestedTotal ? (change / firstInvestedTotal) * 100 : 0;
```

`liquidityTotal` (from `portfolioDerived`, already used elsewhere in this component) is the current cash balance — the same value the history calculator treats as its constant `cashTotal`, since both derive from the same `positions` array and there is no historical cash data to diverge from. No backend/calculator change needed. Verified: `tsc --noEmit` clean, `pnpm lint` clean, `pnpm test` → 75/75 passing.
