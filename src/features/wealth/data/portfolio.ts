import type { Position } from "@/features/wealth/domain/types";

// --------- CARTERA INICIAL (edítala desde la propia interfaz) ----------------
// type: "fondo" | "etf" | "cripto" | "efectivo"
// Para "efectivo": units = saldo en €, price = 1, sin ticker.
export const PORTFOLIO_INITIAL: Position[] = [
  { id: "world",    name: "Fidelity MSCI World",       ticker: "0P0001CLDK.F", type: "fondo",    units: 30.12,    price: 13.9762, group: "rv" },
  { id: "em",       name: "Fidelity Emerging Markets", ticker: "0P0001CJGK.F", type: "fondo",    units: 11.85,    price: 8.8928,  group: "rv" },
  { id: "nasdaq",   name: "iShares Nasdaq 100",        ticker: "CNDX.L",       type: "etf",      units: 0.142,    price: 1024.86, group: "rv" },
  { id: "btc",      name: "Bitcoin",                   ticker: "BTC-EUR",      type: "cripto",   units: 0.003441, price: 60848.0, group: "btc" },
  { id: "liquidez", name: "Fondo emergencia / casa",   ticker: "",             type: "efectivo", units: 489.93,   price: 1,       group: "liquidez" },
];
