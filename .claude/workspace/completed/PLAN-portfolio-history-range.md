# Plan: Portfolio evolution range selector (reconstructed history)

## Goal

Give the "Evolución del patrimonio" line chart in `WealthTab` a range selector — **último día,
última semana, último mes, YTD, último año** (`1d / 1w / 1m / ytd / 1y`) — and feed it with a
**reconstructed** historical portfolio value instead of the 5 hardcoded points in
`PRICE_HISTORY_INITIAL`.

The value at each point in time is reconstructed by taking each instrument's **historical price**
(from Yahoo's chart range endpoint) and multiplying it by its **current unit count**, then summing
across instruments and adding the constant cash contribution. No persistence, no database, no
snapshot table — the portfolio still lives in client `useState`.

**Accepted limitation (explicitly approved by the user).** Because we multiply *today's* holdings by
*past* prices, the curve assumes today's units were held for the whole range. It does **not** reflect
past buys/sells/DCA contributions. This is a documented, deliberate simplification. The
snapshot/persistence alternative was declined and is out of scope.

## Yahoo research and per-range parameters (verified live, not assumed)

This feature builds on the existing current-price slice (`PLAN-price-gateway.md`): `AssetPrice`,
`AssetPriceGateway.fetchPrices`, `YahooFinanceAssetPriceGateway`, `CachingAssetPriceGateway`,
`RefreshPositionPrices`, `src/lib/di/container.ts`, `POST /api/prices`. The historical endpoint is
the same `v8/finance/chart/{ticker}`, but read from `result[0].timestamp[]` +
`result[0].indicators.quote[0].close[]` (with `adjclose` as fallback) instead of `meta`.

I verified the real portfolio tickers live with `curl` (browser-like `User-Agent`). **The findings
are load-bearing and change the design**, so they are recorded here:

| Ticker | Instrument | `interval=1d&range=1mo` history | Notes |
| --- | --- | --- | --- |
| `BTC-EUR` | Bitcoin (EUR) | ~30 daily points, **no `None`** | Trades 24/7 incl. weekends; UTC (`gmtoffset 0`); intraday `5m` works too |
| `CNDX.L` | iShares Nasdaq 100 ETF | ~23 daily points, `adjclose` present | **Quoted in USD**; LSE tz (`gmtoffset 3600`); daily bars stamped ~07:00 UTC; intraday `5m` works (occasional single `None` close) |
| `IE00BYX5NX33.SG` | Fidelity MSCI World fund | **0 points** across `5d/1mo/1y`, `1d/1wk` | No OHLC series on this listing at all; only `meta.regularMarketPrice` (14.0 EUR) is available |
| `FEP2.MU` | Fidelity Emerging Markets fund | **1 point** across all ranges | Same story; only `meta.regularMarketPrice` (8.999 EUR) is reliable |
| `USDEUR=X` | FX rate | ~24 daily points, currency EUR, close ~0.874 | Historical FX per date **is** available → per-bucket USD→EUR conversion is feasible |

**Consequence (the single most important design constraint): the two Fidelity mutual funds — the
bulk of the RV allocation — have effectively no price history on Yahoo.** They can only contribute a
**flat line at their current price**. The chart's real movement will come from `CNDX.L` and
`BTC-EUR` (plus FX). This is inherent to the data source and must be documented in the UI, not hidden.

**Chosen Yahoo parameters per UI range** (verified each returns a usable series for `BTC-EUR`/`CNDX.L`):

| UI range | Yahoo `interval` | Yahoo `range` | Chart granularity | Bucket resolution |
| --- | --- | --- | --- | --- |
| `1d` (día) | `5m` | `1d` | intraday | 300 s (floor timestamps to 5 min) |
| `1w` (semana) | `1d` | `5d` | daily | 1 trading day |
| `1m` (mes) | `1d` | `1mo` | daily | 1 trading day |
| `ytd` (YTD) | `1d` | `ytd` | daily | 1 trading day |
| `1y` (año) | `1wk` | `1y` | daily (weekly bars) | 1 calendar day (per weekly bar) |

`1y` uses `interval=1wk` to keep the payload/point-count reasonable (~52 points instead of ~250).

## Affected layers

[x] domain  [x] application  [x] infrastructure  [x] UI

(No infrastructure/db or Turso change — positions still live in client `useState`; there is no
repository. The Route Handler receives positions in the request body, exactly like `/api/prices`.)

## Cross-ticker date alignment strategy (the trickiest part — specify precisely)

Different instruments report on different calendars (`BTC-EUR` 24/7, `CNDX.L` LSE days only, funds
report nothing). The strategy:

1. **Numeric bucket keys.** Every timestamp is mapped to an integer bucket key so the master axis is
   trivially sortable and unions cleanly:
   - **intraday**: `bucketKey = Math.floor(timestamp / bucketSeconds) * bucketSeconds` (snaps to the
     5-minute grid → `BTC-EUR` and `CNDX.L` intraday bars land on the same keys; verified their
     `5m` timestamps sit on 300 s boundaries).
   - **daily/weekly**: `bucketKey = Math.floor((timestamp + gmtOffsetSeconds) / 86400) * 86400` (the
     instrument's **exchange-local** day start, in epoch seconds). Using `gmtOffsetSeconds` from
     `meta.gmtoffset` avoids off-by-one date shifts between LSE (bars at 07:00 UTC) and UTC crypto.
2. **Master axis** = the **sorted union** of every priceable instrument's bucket keys. Crypto's extra
   weekend days therefore appear as points; the ETF simply forward-fills across them.
3. **Forward-fill + back-fill per instrument.** For each instrument, build `Map<bucketKey, close>`
   (last close wins if two bars share a bucket). For any axis key: use the most recent close at or
   before that key; for keys **before** the instrument's first known bar, use its **earliest** close
   (back-fill). This makes the funds (single synthetic point) a flat line and stops the ETF's LSE
   gaps from creating holes.
4. **FX per bucket.** For each distinct non-EUR currency, fetch `{CUR}EUR=X` history over the same
   range and align it on the same master axis (same forward/back-fill). Each native close is
   converted at that bucket's rate: `euroClose = nativeClose × rateAt(bucketKey)` (EUR → rate 1).
   This mirrors the FX approach already in `RefreshPositionPrices` and keeps currency correct across
   the whole series, not just at the last point.
5. **Value per bucket** = `cashTotal + Σ_priceable(units × euroCloseAt(bucketKey))`. Priceable
   positions whose history the gateway could **not** resolve at all contribute a *constant*
   `units × position.price` (their current EUR price) so the total is never understated, and their
   ticker is reported in `failedTickers`.

## Files to create/modify

### Create — Domain (pure, zero framework deps)

- `src/features/wealth/domain/AssetPriceHistory.ts` — value types `AssetPricePoint`,
  `AssetPriceHistory`.
- `src/features/wealth/domain/HistoryRange.ts` — `HistoryRange` union + `HISTORY_RANGE_SPECS`
  (granularity + bucketSeconds per range).
- `src/features/wealth/domain/HistoryBucketer.ts` — maps timestamp → numeric bucket key and bucket
  key → chart label, per range spec.
- `src/features/wealth/domain/HistoryBucketer.unit.test.ts`
- `src/features/wealth/domain/ForwardFilledSeries.ts` — forward/back-filled close lookup over a set
  of bucketed points.
- `src/features/wealth/domain/ForwardFilledSeries.unit.test.ts`
- `src/features/wealth/domain/PortfolioHistoryCalculator.ts` — the domain service that assembles the
  `PortfolioHistoryPoint[]` from positions + histories + FX histories + range.
- `src/features/wealth/domain/PortfolioHistoryCalculator.unit.test.ts` — **highest-risk logic, most
  thorough coverage**.

### Create — Application

- `src/features/wealth/application/AssetPriceHistoryGateway.ts` — new **driven port**.
- `src/features/wealth/application/ComputePortfolioHistory.ts` — **use case** + its driving-port
  interface + `PortfolioHistoryResult`.
- `src/features/wealth/application/ComputePortfolioHistory.unit.test.ts`

### Create — Infrastructure

- `src/features/wealth/infrastructure/YahooFinanceAssetPriceHistoryGateway.ts` — **driven adapter**.
- `src/features/wealth/infrastructure/YahooFinanceAssetPriceHistoryGateway.unit.test.ts`
- `src/features/wealth/infrastructure/CachingAssetPriceHistoryGateway.ts` — TTL **decorator**
  (longer TTL than the current-price cache; key = `ticker|range`).
- `src/features/wealth/infrastructure/CachingAssetPriceHistoryGateway.unit.test.ts`

### Create — Driving adapter

- `src/app/api/prices/history/route.ts` — `POST` handler, body `{ positions, range }`.

### Modify

- `src/lib/di/container.ts` — wire `CachingAssetPriceHistoryGateway(YahooFinanceAssetPriceHistoryGateway)`
  into `ComputePortfolioHistory`; export `getComputePortfolioHistory()`.
- `src/features/wealth/components/WealthTab.tsx` — range selector buttons in the "Evolución del
  patrimonio" card; own `history` / `historyRange` / `loadingHistory` state; fetch on mount + range
  change; feed the `LineChart`; recompute the delta metric from the fetched series.
- `src/features/wealth/components/WealthTab.tsx` prop change: **remove** the `priceHistory` prop from
  `WealthTabProps`.
- `src/app/page.tsx` — remove the `priceHistory` state, the `PRICE_HISTORY_INITIAL` import, and the
  `priceHistory` prop passed to `WealthTab`.
- `src/features/wealth/data/portfolio.ts` — remove `PRICE_HISTORY_INITIAL` (and the now-unused
  `PortfolioHistoryPoint` import).

### Optional (recommended, not required)

- `src/features/wealth/components/WealthTab.unit.test.tsx` — range selector switches the fetched
  range (mocked `fetch`, semantic role query on the buttons).

Note: `PortfolioHistoryPoint` in `src/features/wealth/domain/types.ts` is **reused unchanged**
(`{ label: string; total: number }`) — it is exactly what Recharts consumes.

## Interface signatures (load-bearing contracts)

Domain — `src/features/wealth/domain/AssetPriceHistory.ts`:

```ts
export interface AssetPricePoint {
  timestamp: number; // epoch seconds of the bar
  close: number;     // close in the instrument's native currency
}

export interface AssetPriceHistory {
  ticker: string;
  currency: string;          // ISO-4217 native currency of the closes
  gmtOffsetSeconds: number;  // meta.gmtoffset — used for exchange-local daily bucketing
  points: AssetPricePoint[]; // chronological; may hold a single synthetic point for funds
}
```

Domain — `src/features/wealth/domain/HistoryRange.ts`:

```ts
export type HistoryRange = "1d" | "1w" | "1m" | "ytd" | "1y";
export type HistoryGranularity = "intraday" | "daily";

export interface HistoryRangeSpec {
  granularity: HistoryGranularity;
  bucketSeconds: number; // intraday grid resolution; unused for "daily"
}

export const HISTORY_RANGE_SPECS: Record<HistoryRange, HistoryRangeSpec> = {
  "1d":  { granularity: "intraday", bucketSeconds: 300 },
  "1w":  { granularity: "daily",    bucketSeconds: 0 },
  "1m":  { granularity: "daily",    bucketSeconds: 0 },
  "ytd": { granularity: "daily",    bucketSeconds: 0 },
  "1y":  { granularity: "daily",    bucketSeconds: 0 },
};
```

Domain — `src/features/wealth/domain/HistoryBucketer.ts`:

```ts
export class HistoryBucketer {
  constructor(private readonly spec: HistoryRangeSpec) {}

  bucketKeyFor(timestamp: number, gmtOffsetSeconds: number): number { /* floor per granularity */ }

  labelFor(bucketKey: number): string { /* intraday -> HH:MM; daily -> "D MMM" es-ES (UTC-stable) */ }
}
```

Domain — `src/features/wealth/domain/ForwardFilledSeries.ts`:

```ts
export class ForwardFilledSeries {
  // closeByBucket need not be sorted; the class sorts its keys once.
  // fallbackClose is used for bucket keys before the earliest known bar (back-fill).
  constructor(closeByBucket: Map<number, number>, fallbackClose: number) { /* ... */ }

  closeAt(bucketKey: number): number { /* last close at or before key, else fallbackClose */ }
}
```

Domain — `src/features/wealth/domain/PortfolioHistoryCalculator.ts`:

```ts
import type { Position, PortfolioHistoryPoint } from "@/features/wealth/domain/types";
import type { AssetPriceHistory } from "@/features/wealth/domain/AssetPriceHistory";
import type { HistoryRange } from "@/features/wealth/domain/HistoryRange";

export interface PortfolioHistoryInputs {
  positions: Position[];
  historyByTicker: Map<string, AssetPriceHistory>;              // priceable ticker -> its history
  exchangeRateHistoryByCurrency: Map<string, AssetPriceHistory>; // e.g. "USD" -> USDEUR=X history
  range: HistoryRange;
}

export class PortfolioHistoryCalculator {
  calculate(inputs: PortfolioHistoryInputs): PortfolioHistoryPoint[] { /* see steps */ }
}
```

Application — driven port `src/features/wealth/application/AssetPriceHistoryGateway.ts`:

```ts
import type { AssetPriceHistory } from "@/features/wealth/domain/AssetPriceHistory";
import type { HistoryRange } from "@/features/wealth/domain/HistoryRange";

export interface AssetPriceHistoryGateway {
  // Batch by design (mirrors AssetPriceGateway.fetchPrices) so the caching decorator and
  // multi-symbol providers stay natural. Unknown/failed tickers are simply absent from the result.
  fetchHistories(tickers: string[], range: HistoryRange): Promise<AssetPriceHistory[]>;
}
```

Application — use case `src/features/wealth/application/ComputePortfolioHistory.ts`:

```ts
import type { Position, PortfolioHistoryPoint } from "@/features/wealth/domain/types";
import type { HistoryRange } from "@/features/wealth/domain/HistoryRange";
import type { AssetPriceHistoryGateway } from "@/features/wealth/application/AssetPriceHistoryGateway";
import { PortfolioHistoryCalculator } from "@/features/wealth/domain/PortfolioHistoryCalculator";

export interface PortfolioHistoryResult {
  points: PortfolioHistoryPoint[];
  failedTickers: string[]; // priceable tickers the provider returned no history for
}

export interface ComputePortfolioHistoryUseCase {
  invoke(positions: Position[], range: HistoryRange): Promise<PortfolioHistoryResult>;
}

export class ComputePortfolioHistory implements ComputePortfolioHistoryUseCase {
  constructor(
    private readonly assetPriceHistory: AssetPriceHistoryGateway,
    private readonly portfolioHistoryCalculator: PortfolioHistoryCalculator,
  ) {}

  invoke(positions: Position[], range: HistoryRange): Promise<PortfolioHistoryResult> { /* steps */ }
}
```

Infrastructure — `src/features/wealth/infrastructure/YahooFinanceAssetPriceHistoryGateway.ts`:

```ts
export class YahooFinanceAssetPriceHistoryGateway implements AssetPriceHistoryGateway {
  async fetchHistories(tickers: string[], range: HistoryRange): Promise<AssetPriceHistory[]> { /* ... */ }
}
```

With a private range→Yahoo params table:

```ts
const YAHOO_RANGE_PARAMETERS: Record<HistoryRange, { interval: string; range: string }> = {
  "1d":  { interval: "5m",  range: "1d"  },
  "1w":  { interval: "1d",  range: "5d"  },
  "1m":  { interval: "1d",  range: "1mo" },
  "ytd": { interval: "1d",  range: "ytd" },
  "1y":  { interval: "1wk", range: "1y"  },
};
```

Infrastructure — `src/features/wealth/infrastructure/CachingAssetPriceHistoryGateway.ts`:

```ts
export class CachingAssetPriceHistoryGateway implements AssetPriceHistoryGateway {
  constructor(
    private readonly delegate: AssetPriceHistoryGateway,
    private readonly ttlMilliseconds: number = 6 * 60 * 60 * 1000, // 6h; past bars are immutable
  ) {}
  async fetchHistories(tickers: string[], range: HistoryRange): Promise<AssetPriceHistory[]> { /* ... */ }
}
```

DI — `src/lib/di/container.ts` (add):

```ts
export function getComputePortfolioHistory(): ComputePortfolioHistoryUseCase { /* singleton */ }
```

## Implementation steps (in order)

1. **Domain value types** — `AssetPriceHistory.ts`, `HistoryRange.ts`. No logic; confirm no
   framework imports.

2. **`HistoryBucketer`** (+ test) — pure. `bucketKeyFor`: intraday floors to `bucketSeconds`; daily
   floors `(timestamp + gmtOffsetSeconds)` to the day. `labelFor`: intraday →
   `toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })`; daily → a Spanish short
   day/month label rendered with `timeZone: "UTC"` so the label matches the bucket day exactly.
   Test intraday flooring, daily offset bucketing (LSE vs UTC land on the intended day), labels.

3. **`ForwardFilledSeries`** (+ test) — sort keys once in the constructor; `closeAt` binary-searches
   the last key `<= bucketKey`, else returns `fallbackClose`. Test: exact hit, gap forward-fill,
   pre-first back-fill, single-point series (funds).

4. **`PortfolioHistoryCalculator`** (+ test) — `calculate(inputs)`:
   1. `cashTotal` = sum of `units` over `type === "efectivo"` positions (named `isCash` helper).
   2. `priceablePositions` = positions with `type !== "efectivo" && ticker !== ""` (reuse an
      `isPriceable` helper — same rule as `RefreshPositionPrices`).
   3. Build a `HistoryBucketer` from `HISTORY_RANGE_SPECS[range]`.
   4. `masterAxis` = sorted unique union of `bucketer.bucketKeyFor(point.timestamp, history.gmtOffsetSeconds)`
      over every history in `historyByTicker`. If empty → return `[]`.
   5. For each priceable position **with** a history: bucket its points into `Map<key, close>`
      (last wins), fallback = earliest chronological close → `ForwardFilledSeries`. Resolve its FX
      `ForwardFilledSeries` from `exchangeRateHistoryByCurrency` (EUR → constant-1 series).
   6. For each priceable position **without** a history: a constant EUR contribution
      `units × position.price` (added to every bucket).
   7. For each `bucketKey` in `masterAxis`:
      `total = cashTotal + Σ_withHistory(units × closeAt(key) × fxRateAt(key)) + Σ_withoutHistory(constant)`;
      `label = bucketer.labelFor(bucketKey)`. Push `{ label, total }`.
   8. Return the points.
   Extract the per-instrument series assembly and the per-bucket summation into named private
   methods (`code-semantic`: a function body reads like a table of contents).

5. **Driven port** — `AssetPriceHistoryGateway.ts` (`fetchHistories`). Document via naming that
   unresolved tickers are omitted (callers diff requested-vs-returned).

6. **Use case** — `ComputePortfolioHistory.invoke(positions, range)`:
   1. `priceableTickers` from priceable positions.
   2. `histories = await this.assetPriceHistory.fetchHistories(priceableTickers, range)`;
      `historyByTicker = new Map(...)`.
   3. `failedTickers` = priceable tickers absent from `historyByTicker`.
   4. Distinct non-EUR currencies from `histories` → `fetchHistories(["{CUR}EUR=X", …], range)` →
      `exchangeRateHistoryByCurrency` keyed by `CUR` (reuse the `${cur}EUR=X` ↔ `cur` mapping
      convention from `RefreshPositionPrices`).
   5. `points = this.portfolioHistoryCalculator.calculate({ positions, historyByTicker, exchangeRateHistoryByCurrency, range })`.
   6. Return `{ points, failedTickers }`.

7. **Yahoo adapter** — `YahooFinanceAssetPriceHistoryGateway.fetchHistories`:
   - Per ticker: `GET .../v8/finance/chart/{encoded}?interval={interval}&range={range}` with the
     browser-like `User-Agent` (reuse the constant/pattern from the existing gateway).
   - Parse `result[0]`: `timestamp[]`, `indicators.quote[0].close[]` (fallback
     `indicators.adjclose[0].adjclose[]`), `meta.currency`, `meta.gmtoffset`. Zip
     timestamp+close, **dropping entries whose close is `null`**.
   - **Fund fallback**: if the zipped list is empty but `meta.regularMarketPrice` exists, emit a
     single synthetic point `{ timestamp: meta.regularMarketTime ?? Math.floor(Date.now()/1000), close: meta.regularMarketPrice }`.
   - Return `null` on `chart.error`, non-ok response, or missing currency/price. `Promise.allSettled`
     across tickers; drop rejected/null (one bad symbol never fails the batch).
   - Encapsulate JSON extraction in a private `toAssetPriceHistory(ticker, raw, ...)` method (no free
     functions), consistent with the existing adapter.

8. **Caching decorator** — `CachingAssetPriceHistoryGateway`: `Map<`ticker|range`, {value, expiresAt}>`;
   serve fresh, fetch only stale/missing `(ticker, range)` pairs from the delegate, merge, update.
   Default TTL 6h (past bars immutable; only today's forming bar is stale, acceptable within window).
   Same batch-merge shape as `CachingAssetPriceGateway`.

9. **Composition root** — `container.ts`: add module-level singletons wiring
   `new CachingAssetPriceHistoryGateway(new YahooFinanceAssetPriceHistoryGateway())` into
   `new ComputePortfolioHistory(historyGateway, new PortfolioHistoryCalculator())`; export
   `getComputePortfolioHistory()`. All `new` stays here.

10. **Route Handler** — `src/app/api/prices/history/route.ts`, `POST`:
    - Read `{ positions, range }: { positions: Position[]; range: HistoryRange }` from the JSON body.
    - `const result = await getComputePortfolioHistory().invoke(positions, range);`
    - `return Response.json(result);`
    - `try/catch (error)` → `Response.json({ error }, { status: 502 })`.

11. **UI** — `WealthTab.tsx`:
    - Remove `priceHistory` from `WealthTabProps`.
    - Add state: `history: PortfolioHistoryPoint[]` (init `[]`), `historyRange: HistoryRange`
      (default `"1m"`), `loadingHistory: boolean`.
    - `loadHistory(range)` (`useCallback`): POST `/api/prices/history` with
      `{ positions: portfolioRef.current, range }`; on success `setHistory(result.points)`; on error
      keep the previous series and surface a small warning (reuse the `priceRefreshWarning` visual
      pattern or a sibling). `portfolioRef` already exists.
    - `useEffect([historyRange, loadHistory])` → `loadHistory(historyRange)` on mount + range change.
    - In the "Evolución del patrimonio" card header, render a range selector using the existing
      `seg` / `seg on` button pattern (same as the Países/Sectores and drilldown toggles):
      `([["1d","Día"],["1w","Semana"],["1m","Mes"],["ytd","YTD"],["1y","Año"]] as Array<[HistoryRange,string]>)`
      → `<button className={`seg ${historyRange===key?"on":""}`} onClick={() => setHistoryRange(key)}>`.
    - `<LineChart data={history}>` (was `priceHistory`). While `loadingHistory && history.length===0`,
      show a lightweight placeholder in place of the chart.
    - Delta metric: recompute from the fetched series — `firstTotal = history[0]?.total ?? total`;
      `change = total - firstTotal`; adapt the label from "desde el último mes registrado" to a
      range-aware phrase (e.g. "en el rango seleccionado"). This removes the last dependency on
      `PRICE_HISTORY_INITIAL`.
    - **Addendum (supersedes the note below and the "Fund history gap" risk):** `portfolio.ts` was
      corrected to use `0P0001CLDK.F` (World) and `0P0001CJGK.F` (Emerging Markets) — the EUR "P Acc"
      share-class listings — instead of the original `IE00BYX5NX33.SG`/`FEP2.MU`. Verified live: both
      return ~22/23 daily points over `1mo`, ~127/128 over `ytd`, ~253/254 over `1y`, in EUR. The funds
      now have real history like the ETF, so the "flat line" fallback path in `ForwardFilledSeries`
      (single-point series) becomes a defensive case for any *future* unresolvable ticker, not the
      expected behavior for this portfolio. **Do not add the flat-funds UI note below** — it would be
      inaccurate for this data. ~~Add a one-line note under the chart that fund values are held flat
      (no public history), so the curve reflects mainly the ETF, BTC and FX — surfacing the accepted
      limitation honestly.~~ (superseded)

12. **Wire-up cleanup** — `page.tsx`: drop `priceHistory` state, `PRICE_HISTORY_INITIAL` import, and
    the prop. `portfolio.ts`: delete `PRICE_HISTORY_INITIAL` and the now-unused
    `PortfolioHistoryPoint` import.

## Testing strategy

- **Unit — `HistoryBucketer`**: intraday flooring to the 5-minute grid; daily bucketing that a LSE
  bar (`gmtoffset 3600`, ~07:00 UTC) and a UTC crypto bar on the same calendar day map to the same
  daily key; intraday `HH:MM` and daily `D MMM` labels.
- **Unit — `ForwardFilledSeries`**: exact-key hit; forward-fill across a gap; back-fill before the
  first known bucket (fallback); single-point series stays flat (the fund case).
- **Unit — `PortfolioHistoryCalculator`** (**most thorough — the highest-risk logic**): build
  histories by hand and assert the composed `PortfolioHistoryPoint[]`, including:
  - two instruments on **staggered/missing dates** (crypto has weekend keys the ETF lacks) →
    correct forward-fill and a master axis = union of both calendars.
  - **USD FX conversion per bucket**: a USD instrument + a `USD` entry in
    `exchangeRateHistoryByCurrency` → each bucket multiplied by that bucket's rate (different rates on
    different days produce different euro values).
  - **cash constant** added to every bucket.
  - **fund flat line**: a single-point history → constant current price across the whole axis.
  - **failed ticker** (priceable, absent from `historyByTicker`) → constant `units × price`
    contribution (never dropped, never zero).
  - empty `historyByTicker` → `[]`.
  Derive every expected `total` from the inputs (no magic numbers) per the `testing` skill.
- **Unit — `ComputePortfolioHistory`**: fake `AssetPriceHistoryGateway`; **real**
  `PortfolioHistoryCalculator` (domain is never mocked). Assert: `fetchHistories` called with the
  priceable tickers and the requested range; a second `fetchHistories` requested for `{CUR}EUR=X`
  when a foreign currency appears; `failedTickers` lists a priceable ticker the fake omits; the
  returned `points` equal the calculator's output for the assembled maps.
- **Unit — `YahooFinanceAssetPriceHistoryGateway`**: stub global `fetch` (mirror
  `YahooFinanceAssetPriceGateway.unit.test.ts`). Assert: correct URL `interval`/`range` per
  `HistoryRange`; timestamp+close zipping with `meta.currency`/`meta.gmtoffset`; `null` closes
  dropped; `adjclose` fallback when `quote.close` is absent; empty series + `meta.regularMarketPrice`
  → single synthetic point (fund case); `chart.error`, non-ok, and rejected fetch → dropped. No live
  network in CI.
- **Unit — `CachingAssetPriceHistoryGateway`**: fake delegate counting calls; a second
  `fetchHistories` for the same `(ticker, range)` within TTL does not hit the delegate; the **same
  ticker with a different range** does refetch (key includes range); only stale/missing pairs are
  refetched.
- **Optional component — `WealthTab.unit.test.tsx`**: mock `fetch`; clicking a range button (queried
  by role/name) triggers a `/api/prices/history` POST carrying that range. Query by semantic role,
  never CSS class (`testing` skill).
- **Integration**: none. No Turso repository is introduced. A live Yahoo call would be flaky in CI;
  if wanted, add an explicitly skipped/manual smoke test, not part of `pnpm test`.

## Architecture decisions

- **Separate driven port `AssetPriceHistoryGateway` (not an extension of `AssetPriceGateway`).**
  Interface Segregation: current-price consumers (`RefreshPositionPrices`, and the `CachingAssetPriceGateway`
  decorator) must not grow a history method they don't use, and vice-versa. History caching has
  genuinely different semantics (immutable past bars → 6h TTL vs 15-min current-price TTL), so each
  port gets its own caching decorator with its own TTL. The two Yahoo adapters are distinct classes so
  the existing, already-tested `YahooFinanceAssetPriceGateway` stays untouched (lower risk).
- **The alignment logic lives in the Domain as pure, class-first services.** `HistoryBucketer`,
  `ForwardFilledSeries` and `PortfolioHistoryCalculator` are framework-free and are the feature's
  highest-risk logic, so they are small, independently testable classes (SRP), not one procedural
  blob. Numeric bucket keys keep the master-axis union/sort trivial.
- **Reuse `PortfolioHistoryPoint` and the `{CUR}EUR=X` FX convention.** No new UI/serialization type;
  FX mirrors `RefreshPositionPrices` exactly (same gateway shape, same ticker mapping), so the two
  use cases stay consistent and the response is plain JSON.
- **Funds are held flat, honestly surfaced.** Yahoo exposes no history for the two Fidelity funds;
  rather than dropping them (understating the portfolio) they contribute a flat line at their current
  price, with a visible note in the UI. This is the accepted-limitation approach the user chose.
- **POST `/api/prices/history` with `{ positions, range }` (not GET).** Consistent with the existing
  `POST /api/prices`: positions live in client memory and don't serialize cleanly into a query string,
  and upstream caching is handled by the decorator (so HTTP cacheability buys nothing here). A
  `GET /api/prices/history?range=…` only becomes attractive once positions are persisted server-side —
  noted, not chosen, exactly as in the current-price plan.
- **No persistence / no Turso.** Same rationale as `PLAN-price-gateway.md`: the task is price
  reconstruction, not portfolio storage. When positions are later persisted, a `PositionRepository`
  read replaces the request body and the use-case signature is unchanged.
- **Minimal composition root.** One more factory function alongside `getRefreshPositionPrices()`, not
  a DI framework — proportional to two use cases (YAGNI).
- **This introduces no new folders** — the `wealth` slice already has `domain/`, `application/`,
  `infrastructure/`; the new files slot into the existing shape.

## Risks and dependencies

- **Fund history gap (highest-impact, already mitigated).** Verified: `IE00BYX5NX33.SG` returns 0
  history points, `FEP2.MU` returns 1. These are the largest RV holdings, so the reconstructed curve
  reflects mainly `CNDX.L` + `BTC-EUR` + FX. Mitigation: flat-line the funds at current price and say
  so in the UI. If the user later wants real fund NAV history, an alternative listing/provider would
  be needed (out of scope; the port seam allows it).
- **Currency correctness.** `CNDX.L` is USD. The design converts each USD close by that bucket's
  `USDEUR=X` rate (FX history verified available). If FX history is missing for a range, the
  calculator's back-fill uses the earliest known rate (documented fallback); worst case, flag the
  position. This also quietly corrects the pre-existing "USD price treated as EUR" bug for the ETF.
- **Intraday alignment edge (`1d`).** `5m` bars sit on 300 s boundaries (verified) so instruments
  align after flooring; the only oddity is the trailing *live* forming candle (seen at a non-grid
  timestamp), which flooring snaps back onto the grid — acceptable. LSE-only hours mean `CNDX.L` is
  forward-filled outside 08:00–16:30 London; that is correct behavior, not a bug.
- **Provider fragility / bot-blocking.** Same as the current-price slice: unofficial endpoint,
  requires a browser-like `User-Agent`, can rate-limit serverless egress. Mitigated by the port seam,
  the 6h history cache, and the manual/edit fallbacks already in the UI.
- **Point-count / payload for `1y`.** Using `interval=1wk` keeps `1y` to ~52 points; `ytd` daily can
  reach ~180 points but is fine for a personal dashboard. Revisit only if Recharts renders slowly.
- **Implementation order:** value types → `HistoryBucketer` (+test) → `ForwardFilledSeries` (+test) →
  `PortfolioHistoryCalculator` (+test) → port → use case (+test) → Yahoo adapter (+test) → caching
  decorator (+test) → container → Route Handler → UI rewrite → `page.tsx` / `portfolio.ts` cleanup.
  The UI depends on the route; the route on the container; the container on the adapter + use case.
- **No new dependencies:** native `fetch` on the server; no `package.json` change.
```
