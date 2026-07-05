import type { Debt } from "@/shared/domain/types";

// --------- DEUDAS INICIALES (edítalas desde la pestaña Metas) ---------------
export const DEBTS_INITIAL: Debt[] = [
  { id: "coche",      name: "Coche (financiación)",              installment: 173.28, balance: 8000, note: "En curso, sin fecha de fin fija" },
  { id: "applewatch", name: "Apple Watch (revolving 24% TAE)",   installment: 75,     balance: 105,  note: "Liquidar antes del 10 de julio 2026", deadline: "2026-07-10" },
  { id: "kindle",     name: "Kindle",                            installment: 44,     balance: 132,  note: "Liquida en septiembre 2026" },
  { id: "ledger",     name: "Ledger Nano X (3 plazos)",          installment: 39.53,  balance: 79.06, note: "Financiada jul–ago–sep 2026" },
];
