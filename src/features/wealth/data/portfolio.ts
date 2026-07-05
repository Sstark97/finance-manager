import type { Position, PortfolioHistoryPoint } from "@/features/wealth/domain/types";

// --------- CARTERA INICIAL (edítala desde la propia interfaz) ----------------
// type: "fondo" | "etf" | "cripto" | "efectivo"
// Para "efectivo": units = saldo en €, price = 1, sin ticker.
export const PORTFOLIO_INITIAL: Position[] = [
  { id: "world",    name: "Fidelity MSCI World",       ticker: "0P0000KSPA.F", type: "fondo",    units: 30.12,    price: 18.72,   group: "rv" },
  { id: "em",       name: "Fidelity Emerging Markets", ticker: "0P0000KSP9.F", type: "fondo",    units: 11.85,    price: 12.86,   group: "rv" },
  { id: "nasdaq",   name: "iShares Nasdaq 100",        ticker: "CNDX.L",       type: "etf",      units: 0.142,    price: 1024.86, group: "rv" },
  { id: "btc",      name: "Bitcoin",                   ticker: "BTC-EUR",      type: "cripto",   units: 0.003441, price: 60848.0, group: "btc" },
  { id: "liquidez", name: "Fondo emergencia / casa",   ticker: "",             type: "efectivo", units: 489.93,   price: 1,       group: "liquidez" },
];

export const PRICE_HISTORY_INITIAL: PortfolioHistoryPoint[] = [
  { label: "Feb 26", total: 618 }, { label: "Mar 26", total: 1046 },
  { label: "Abr 26", total: 1300 }, { label: "May 26", total: 1450 }, { label: "Jun 26", total: 1561 },
];
