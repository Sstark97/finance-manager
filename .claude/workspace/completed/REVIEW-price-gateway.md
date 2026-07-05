# Review: Real asset-price backend (AssetPriceGateway)

## Verdict: PASS

Re-verification pass (2026-07-05). All three original blocking findings in the Route Handler are
resolved, and the follow-up `react-hooks/set-state-in-effect` lint fix in `WealthTab.tsx` is a
legitimate, durable fix rather than suppression. The hexagonal design, FX logic, class-first
boundaries and tests remain as strong as the original review found them. Verdict flips FAIL → PASS.

## Resolved blocking findings (verified fixed)

- `src/app/api/prices/route.ts` — Debug `console.log(result)` removed. The handler now assigns
  `result` (line 15) and returns it directly (line 16); no logging remains anywhere in the file.
- `src/app/api/prices/route.ts:17-19` — Error leak fixed. `catch {` no longer binds the error and
  returns a fixed generic message (`"No se pudo actualizar los precios"`) with status 502. No
  `error.message` is exposed to the client.
- `src/app/api/prices/route.ts:10-12` — Body validation added. The body is cast to
  `Partial<RefreshPricesRequestBody> | null` and guarded with `if (!Array.isArray(body?.positions))`,
  returning 400 before the use case runs. Malformed input now yields the correct 400 error class
  instead of a spurious 502.

## Follow-up lint fix (verified sound)

- `src/features/wealth/components/WealthTab.tsx:135-139` — Wrapping the mount fetch in
  `setTimeout(refreshPrices, 0)` genuinely moves `refreshPrices`'s first synchronous
  `setLoadingPrices(true)` out of the effect's commit-phase execution, addressing the
  `set-state-in-effect` warning at its root. No stale/zero-data flash: displayed prices come from the
  already-populated `portfolio` prop, and the one-tick deferral is negligible against the fetch's
  network round-trip. Cleanup clears both `initialFetchId` and `intervalId`, so no timer leaks under
  strict-mode double-invoke or repeated mounts. Legitimate fix; the only cleaner long-term option
  (not making `setLoadingPrices` the first synchronous statement) is a nicety, not a blocker.

## Warnings (non-blocking)

- `src/features/wealth/infrastructure/CachingAssetPriceGateway.ts:12,29-31` — Unbounded cache growth.
  The `cacheByTicker` Map is a module-level singleton keyed by client-supplied tickers; entries are only
  overwritten when the same ticker is re-requested and expired ones are never evicted. A client POSTing
  many distinct tickers grows the map without bound and never reclaims it. Add size-bounding / periodic
  eviction of expired entries. (Low severity in practice: serverless instances are short-lived and the
  real portfolio has ~4 tickers, but the key space is attacker-controlled.)
- `src/app/api/prices/route.ts` — The endpoint turns the app into an open proxy that issues one outbound
  Yahoo `fetch` per unique ticker in the body (the ticker is URL-encoded into the path, so host-level SSRF
  is not possible, but request amplification is). Consider capping the number of positions accepted.
- `src/features/wealth/components/WealthTab.tsx:115-139` — No `AbortController`; if the component unmounts
  mid-fetch, `setPortfolio`/`setLoadingPrices` run after unmount. Harmless in React 19 but worth an abort
  for cleanliness. The auto-poll also fires a POST on every mount (e.g. tab switch); acceptable because the
  server-side 15-min cache absorbs it.
- `src/features/wealth/application/RefreshPositionPrices.unit.test.ts:75` — The `total` assertion derives
  `expectedTotal` from `result.positions` (the output), so it is mildly circular. It still proves `total`
  is computed from the refreshed positions via `PortfolioCalculator`, so it is acceptable, but a fixed
  expected number would be a stronger spec.
- `src/lib/di/container.ts:7` vs `src/features/wealth/domain/PortfolioCalculator.ts:42` — the container
  does `new PortfolioCalculator()` while the domain module also exports a `portfolioCalculator` singleton;
  two construction sites for the same stateless calculator. Minor; pre-existing singleton is out of scope.

## Positive points

- FX currency conversion is correct and does not silently misprice. `toExchangeRateTicker("USD")` →
  `"USDEUR=X"`, whose Yahoo quote is EUR-per-USD, and `price * rate` yields EUR — right direction. The
  reverse mapping (`toCurrencyFromExchangeRateTicker`) keys the rate back to `"USD"` correctly. A currency
  whose `{CUR}EUR=X` rate cannot be resolved is pushed to `failedTickers` and keeps its previous price
  (`toEuroPrice` returns `null`), so unconvertible instruments (e.g. GBp pence listings) are flagged rather
  than mispriced. Verified by two tests (convert-to-EUR, and mark-failed-when-rate-missing).
- Hexagonal boundaries are clean: `domain/AssetPrice.ts` is a pure interface; `application/` imports only
  domain + its port; the Yahoo/`fetch` client is confined to `infrastructure/`; the Route Handler and the
  client component depend only on the use case and a type, never on infrastructure. The old client-side
  `fetchYahooPrice` infra import is gone.
- Class-first respected: use case, adapter and caching decorator are all named classes implementing the
  port; every `new` lives in the composition root (`container.ts`) or in tests. The free helpers in
  `RefreshPositionPrices.ts` are file-private tiny pure functions, which the skill explicitly permits.
- The React polling/ref/useCallback pattern is sound. `portfolioRef` + a sync `useEffect` removes any
  stale-closure risk (the poll reads `portfolioRef.current`, not the prop); `refreshPrices` is memoized on
  the stable `setPortfolio` so the interval effect runs once. Under strict-mode double-invoke the cleanup
  clears the first interval before the second is created, so no duplicate interval leaks — only a harmless
  duplicate initial fetch (idempotent via the server cache). React Compiler is not enabled in this repo, so
  the manual memoization is warranted rather than redundant. Swapping the blocking `alert()` for
  `setPriceRefreshWarning` is the right call for a background poll.
- Tests are meaningful, not tautological: use-case tests assert merge, cash-untouched, failed-ticker
  retention, and both FX paths; the adapter test asserts URL/encoding, field mapping, and drop-on-error/
  not-ok/reject; the cache test asserts single upstream call within TTL, refetch after expiry, and
  partial (stale-only) refetch. 14/14 pass, `tsc --noEmit` clean, zero `any`.
