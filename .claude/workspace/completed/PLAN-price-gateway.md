# Plan: Real asset price backend (AssetPriceGateway)

## Goal

Replace the stub `fetchYahooPrice()` with a real backend that fetches live market prices for each
portfolio position and computes its real value in euros. The frontend today calls Yahoo directly
from the browser and fails on CORS; the browser-side placeholder throws
`"Conecta tu backend en fetchYahooPrice()"`. We move price fetching to a Next.js Route Handler
(server-side, no CORS), behind a proper hexagonal boundary in the `wealth` vertical slice.

## Provider research and recommendation

The decisive constraint is **this portfolio's exact instruments** (`src/features/wealth/data/portfolio.ts`):

| Position | Ticker | Instrument type |
| --- | --- | --- |
| Fidelity MSCI World | `0P0000KSPA.F` | European mutual fund (Yahoo/Morningstar `0P…` id) |
| Fidelity Emerging Markets | `0P0000KSP9.F` | European mutual fund (`0P…` id) |
| iShares Nasdaq 100 | `CNDX.L` | LSE-listed ETF (quoted in **USD**) |
| Bitcoin | `BTC-EUR` | Crypto pair (quoted in **EUR**) |
| Fondo emergencia | — | Cash (no ticker, price = 1) |

Comparison of free providers for **these** symbols:

- **Yahoo Finance (unofficial)** — No API key. Covers all four instrument types in one API,
  including the `0P0000…` European mutual-fund ids and the LSE `CNDX.L` line, which the
  key-based providers below do **not** resolve. Downsides: unofficial, ToS-gray, breaking changes.
  The batch `v7/finance/quote` endpoint now requires a rotating cookie+crumb (see research on
  `Invalid Cookie` / `Invalid Crumb`), but the per-symbol `v8/finance/chart/{symbol}` endpoint
  still returns `meta.regularMarketPrice` + `meta.currency` **without** crumb/cookie and is far
  more robust to scrape. With ~4 symbols and a manual refresh button, N per-symbol calls are cheap.
- **Alpha Vantage** — API key, free tier only 25 calls/day + 5/min. No European mutual-fund
  coverage by `0P…` id. Unusable for the funds; too tight for a refresh button.
- **Finnhub** — API key, 60 calls/min free, but real-time quotes on paid tiers; no `0P…` fund
  coverage. Would only serve the ETF/crypto.
- **Twelve Data** — API key, 800 calls/day free, 4h-delayed. Broad coverage but funds keyed by
  ISIN on paid tiers, not the Yahoo `0P…` ids we already store.
- **IEX Cloud** — Sunset for retail in 2025. Discard.
- **Financial Modeling Prep** — API key; US-centric; weak European mutual-fund coverage.
- **CoinGecko** — No key, EUR-native, excellent for **crypto only** (BTC). Good fallback for the
  `BTC-EUR` position, useless for funds/ETFs.

**Recommendation**

- **Primary: Yahoo Finance via the `v8/finance/chart/{symbol}` endpoint (no key, no crumb).** It is
  the only free source that resolves this portfolio's full instrument set. We accept its fragility
  and neutralize it by hiding it behind the `AssetPriceGateway` port so it can be swapped without
  touching the domain, application, or UI.
- **Fallback (documented, not built in MVP): CoinGecko for crypto + manual price entry for funds.**
  The UI already lets the user type a price by hand, which is the ultimate fallback for any symbol
  the provider cannot resolve. A second `AssetPriceGateway` implementation (CoinGecko) can be added
  later and composed as a fallback decorator without new abstractions.

Zero new npm dependencies: native `fetch` on the server covers everything.

## Affected layers

[x] domain  [x] application  [x] infrastructure  [x] UI

(No infrastructure/db or Turso change — the portfolio still lives in client `useState`; there is no
repository yet. See "Architecture decisions" for why we deliberately do **not** persist here.)

## Files to create/modify

Create:
- `src/features/wealth/domain/AssetPrice.ts` — pure value type `AssetPrice` (ticker, price,
  currency, asOf). Zero framework deps.
- `src/features/wealth/application/AssetPriceGateway.ts` — **driven port** interface consumed by the
  use case, implemented by infrastructure.
- `src/features/wealth/application/RefreshPositionPrices.ts` — **use case** class + its driving-port
  interface. Fetches prices for a position list and computes real values via `PortfolioCalculator`.
- `src/features/wealth/application/RefreshPositionPrices.unit.test.ts` — use case unit test with a
  fake gateway.
- `src/features/wealth/infrastructure/YahooFinanceAssetPriceGateway.ts` — **driven adapter** class
  implementing `AssetPriceGateway` against the Yahoo chart endpoint.
- `src/features/wealth/infrastructure/YahooFinanceAssetPriceGateway.unit.test.ts` — adapter test
  against a mocked `fetch` (URL building + JSON mapping + error/unknown-ticker handling).
- `src/features/wealth/infrastructure/CachingAssetPriceGateway.ts` — TTL caching **decorator**
  implementing `AssetPriceGateway`, wrapping another gateway.
- `src/features/wealth/infrastructure/CachingAssetPriceGateway.unit.test.ts` — asserts a single
  upstream call within the TTL window.
- `src/lib/di/container.ts` — minimal composition root: wires
  `CachingAssetPriceGateway(YahooFinanceAssetPriceGateway)` into `RefreshPositionPrices`.
- `src/app/api/prices/route.ts` — **driving adapter** (Route Handler). Resolves the use case from
  the container and returns the refreshed result.

Modify:
- `src/features/wealth/components/WealthTab.tsx` — rewrite `refreshPrices()` to POST the current
  positions to `/api/prices`, then apply the returned refreshed positions (and surface
  `failedTickers`). Remove the `fetchYahooPrice` import.
- `src/app/page.tsx` — footer copy references `fetchYahooPrice`; update to the new backend wording.

Delete:
- `src/features/wealth/infrastructure/YahooPriceGateway.ts` — the loose stub function is superseded
  by the class adapter (loose script-style function violates `class-first-architecture`).

## Interface signatures (the load-bearing contracts)

Domain value type — `src/features/wealth/domain/AssetPrice.ts`:

```ts
export interface AssetPrice {
  ticker: string;
  price: number;      // in `currency`, as returned by the provider (native)
  currency: string;   // ISO-4217, e.g. "EUR", "USD"
  asOf: string;       // ISO timestamp of the quote
}
```

Driven port — `src/features/wealth/application/AssetPriceGateway.ts`:

```ts
import type { AssetPrice } from "@/features/wealth/domain/AssetPrice";

export interface AssetPriceGateway {
  // Batch by design so a caching/rate-limiting decorator and multi-symbol providers stay natural.
  // Unknown or failed tickers are simply absent from the result (never throws per-ticker).
  fetchPrices(tickers: string[]): Promise<AssetPrice[]>;
}
```

Driving port + use case — `src/features/wealth/application/RefreshPositionPrices.ts`:

```ts
import type { Position } from "@/features/wealth/domain/types";
import type { AssetPriceGateway } from "@/features/wealth/application/AssetPriceGateway";
import { PortfolioCalculator } from "@/features/wealth/domain/PortfolioCalculator";

export interface PositionPricingResult {
  positions: Position[];   // same positions, prices refreshed (EUR); cash & unresolved untouched
  total: number;           // real portfolio value in EUR, computed by PortfolioCalculator
  failedTickers: string[]; // priceable tickers the provider could not resolve
}

export interface RefreshPositionPricesUseCase {
  invoke(positions: Position[]): Promise<PositionPricingResult>;
}

export class RefreshPositionPrices implements RefreshPositionPricesUseCase {
  constructor(
    private readonly assetPrices: AssetPriceGateway,
    private readonly portfolioCalculator: PortfolioCalculator,
  ) {}

  invoke(positions: Position[]): Promise<PositionPricingResult> { /* see steps */ }
}
```

Driven adapter — `src/features/wealth/infrastructure/YahooFinanceAssetPriceGateway.ts`:

```ts
export class YahooFinanceAssetPriceGateway implements AssetPriceGateway {
  async fetchPrices(tickers: string[]): Promise<AssetPrice[]> { /* per-symbol chart calls */ }
}
```

Caching decorator — `src/features/wealth/infrastructure/CachingAssetPriceGateway.ts`:

```ts
export class CachingAssetPriceGateway implements AssetPriceGateway {
  constructor(
    private readonly delegate: AssetPriceGateway,
    private readonly ttlMilliseconds: number = 15 * 60 * 1000,
  ) {}
  async fetchPrices(tickers: string[]): Promise<AssetPrice[]> { /* TTL cache per ticker */ }
}
```

## Implementation steps

1. **Domain** — add `AssetPrice.ts` (pure interface above). No logic. Confirm no framework imports.

2. **Driven port** — add `AssetPriceGateway.ts` with the `fetchPrices(tickers)` contract. Document
   in an intent-revealing name (not a comment) that unresolved tickers are omitted rather than
   throwing, so callers diff requested-vs-returned to detect failures.

3. **Use case** — implement `RefreshPositionPrices.invoke(positions)`:
   1. Extract priceable tickers: `positions.filter(p => p.type !== "efectivo" && p.ticker)`.
      Use a named helper (`isPriceable`) rather than an inline compound guard (`code-semantic`).
   2. `const prices = await this.assetPrices.fetchPrices(priceableTickers)`.
   3. Build a `Map<ticker, AssetPrice>` for lookup.
   4. Map positions → refreshed positions: for a resolved priceable ticker, replace `price` with the
      EUR value (see FX note in step 3.5); cash and unresolved tickers keep their existing `price`.
   5. **Currency normalization (see "Currency" below).** MVP: pass native `price` through and record
      any non-EUR ticker in `failedTickers` is **not** correct — instead the MVP keeps native price
      but the seam (`AssetPrice.currency`) is already present. Recommended MVP behavior: convert
      using an FX lookup through the *same* gateway (`fetchPrices(["USDEUR=X", …])`) so no second
      port is needed; if FX is deferred, document the non-EUR positions as a known limitation.
   6. `failedTickers` = priceable tickers absent from the map.
   7. `total = this.portfolioCalculator.derive(refreshedPositions).total`.
   8. Return `{ positions: refreshedPositions, total, failedTickers }`.
   `invoke` reuses the existing pure `PortfolioCalculator` (domain) — the "compute real position
   values" requirement is satisfied inside the application layer, and the result is fully
   JSON-serializable (unlike `PortfolioDerived`, which carries the `equityWeightOf` function).

4. **Yahoo adapter** — implement `YahooFinanceAssetPriceGateway.fetchPrices`:
   - For each ticker, `GET https://query1.finance.yahoo.com/v8/finance/chart/{encoded-ticker}?interval=1d&range=1d`.
   - Send a browser-like `User-Agent` header (Yahoo blocks generic agents).
   - Parse `chart.result[0].meta.regularMarketPrice` and `meta.currency`; `asOf` from
     `meta.regularMarketTime` (epoch seconds → ISO) or `Date.now()`.
   - Run the per-ticker calls with `Promise.allSettled`; drop rejected/`chart.error`/missing-price
     results (unknown ticker, provider hiccup) so one bad symbol never fails the batch.
   - Encapsulate the JSON-shape extraction in a private method (`toAssetPrice(raw)`), not free
     functions (`class-first-architecture`).

5. **Caching decorator** — implement `CachingAssetPriceGateway`: keep a `Map<ticker, {value, expiresAt}>`;
   serve fresh entries from cache, fetch only the stale/missing tickers from `delegate`, merge, and
   update the cache. TTL default 15 min. This keeps the provider untouched on every render and makes
   the manual refresh button idempotent within the window.

6. **Composition root** — `src/lib/di/container.ts`. Introduce a lightweight factory (not a DI
   framework — YAGNI): a module-level singleton wiring
   `new CachingAssetPriceGateway(new YahooFinanceAssetPriceGateway())` into
   `new RefreshPositionPrices(gateway, new PortfolioCalculator())`, exposed as
   `export function getRefreshPositionPrices(): RefreshPositionPricesUseCase`. All `new` lives here,
   per `class-first-architecture` (composition-root ownership). This is the first DI seam in the
   repo; it is intentionally minimal and can grow into `src/lib/di/ContainerDI.ts` when a second
   use case appears.

7. **Route Handler** — `src/app/api/prices/route.ts`, `export async function POST(request)`:
   - Read `{ positions }: { positions: Position[] }` from the JSON body.
   - `const useCase = getRefreshPositionPrices();`
   - `const result = await useCase.invoke(positions);`
   - `return Response.json(result);` — handler stays thin; it never touches the provider directly.
   - Wrap in `try/catch (error)`; on provider-wide failure return `Response.json({ error }, { status: 502 })`.
   - Endpoint is POST (not GET) because the client sends its in-memory positions; upstream caching is
     handled by the decorator, so HTTP-cacheability is not needed. (A simpler `GET
     /api/prices?tickers=…` returning `AssetPrice[]` is a valid alternative once positions are
     persisted server-side — noted, not chosen.)

8. **UI** — rewrite `WealthTab.refreshPrices()`:
   - POST `/api/prices` with `{ positions: portfolio }`.
   - On success: `setPortfolio(result.positions)`; if `result.failedTickers.length`, show a warning
     listing them (keep the existing "edit price by hand" guidance).
   - On network/502 error: keep current positions, show the existing fallback message.
   - Remove the `fetchYahooPrice` import and the per-ticker `Promise.all` block.
   - Keep the loading state and the `↻ Actualizar precios` button as-is.

9. **Cleanup** — delete `YahooPriceGateway.ts`; update the `page.tsx` footer copy.

## Testing strategy

- **Unit — use case** (`RefreshPositionPrices.unit.test.ts`): fake `AssetPriceGateway` returning
  canned `AssetPrice[]`. Assert: prices merged into the right positions; cash (`efectivo`) untouched;
  a ticker the fake omits lands in `failedTickers` and keeps its old price; `total` equals
  `PortfolioCalculator.derive(...).total`. Tests read as executable specs (`testing` skill).
- **Unit — Yahoo adapter** (`YahooFinanceAssetPriceGateway.unit.test.ts`): stub global `fetch`
  (vitest). Assert correct URL/encoding per ticker, correct mapping of
  `meta.regularMarketPrice`/`currency`/time, and that a `chart.error` / rejected fetch is dropped
  from the result. No live network call in CI.
- **Unit — caching decorator** (`CachingAssetPriceGateway.unit.test.ts`): fake delegate counting
  calls; assert a second `fetchPrices` for the same ticker within TTL does not hit the delegate, and
  that only stale/missing tickers are refetched.
- **Integration**: none. There is no Turso repository in this task (the repo's integration tests are
  reserved for libSQL). A live Yahoo smoke test would be flaky and network-dependent; if desired,
  add it as an explicitly skipped/manual test, not part of `pnpm test`.

## Architecture decisions

- **Port-isolated provider.** Yahoo is unofficial and fragile; the `AssetPriceGateway` driven port
  is the seam that keeps that risk out of domain/application/UI and lets us swap providers or add a
  CoinGecko fallback decorator later without ripple.
- **Class-first everywhere.** The stub `fetchYahooPrice` loose function is replaced by a named
  adapter class; caching is a decorator class; construction is centralized in the composition root.
  This satisfies `class-first-architecture` (no script-style feature logic, interface at boundary,
  `new` only in the composition root).
- **Reuse the domain calculator.** The use case computes real values through the existing pure
  `PortfolioCalculator`, so valuation logic is not duplicated and the response is serializable.
- **New `application/` folder in the wealth slice.** The vertical slice had only `domain/`,
  `infrastructure/`, `components/`, `data/`. Per `hexagonal-architecture` the use case + ports belong
  in `application/`; this is the first feature to justify it, so we introduce it now (not
  speculatively). Ports live beside the use case inside the slice rather than in a global
  `application/ports/driving|driven` tree — proportional to a single-use-case slice (YAGNI); grow
  into the fuller split only when a second slice needs shared ports.
- **No persistence / no Turso.** Positions live in client `useState`; there is no repository. We
  deliberately do **not** introduce Turso here — the task is price fetching, and adding a repository
  now would be speculative scope. The Route Handler receives positions from the client. When
  positions are later persisted, a `PositionRepository` driven port + a server-side read replaces the
  request body; the use case signature stays the same.
- **Minimal composition root.** A single factory function, not a DI container library — the current
  surface (one use case) does not justify more.

## Risks and dependencies

- **Currency correctness (highest-value risk).** Yahoo returns each quote in the instrument's native
  currency. `BTC-EUR` and the `0P…` Fidelity funds are EUR, but **`CNDX.L` is quoted in USD** while
  the app treats every `price` as euros (the stored `1024.86` is effectively USD today — a
  pre-existing bug). Two remediation paths, both enabled by `AssetPrice.currency`:
  1. *Pragmatic:* use the EUR-quoted listing of the ETF (e.g. a Milan/Xetra line) so the native
     currency is already EUR; document that tickers must be EUR-denominated.
  2. *Robust (recommended follow-up):* in the use case, collect distinct non-EUR currencies and fetch
     `"{CUR}EUR=X"` rates through the *same* `AssetPriceGateway`, then convert — no second port. Ship
     this in the same task if time allows; otherwise flag non-EUR positions to the user.
- **Provider fragility / ToS.** The chart endpoint can change or rate-limit. Mitigated by the port
  seam, the 15-min cache, the manual-refresh UX, and the always-available manual price entry. Keep an
  eye on `chart.error` shapes.
- **Yahoo bot-blocking.** Requires a browser-like `User-Agent`; requests from some server IPs
  (serverless egress) may be throttled. The chart endpoint avoids the crumb/cookie dance that breaks
  the `v7/quote` batch endpoint, which is why it is chosen.
- **`0P…` mutual-fund NAV latency.** Fund NAVs update once daily; the "last price" may lag intraday.
  Acceptable for a personal net-worth dashboard.
- **Implementation order:** domain → port → use case (+test) → Yahoo adapter (+test) → caching
  decorator (+test) → composition root → Route Handler → UI rewrite → delete stub / copy fix. The UI
  change depends on the route; the route depends on the container; the container depends on the
  adapter and use case.
- **No new dependencies:** native `fetch` only; nothing added to `package.json`.
```
