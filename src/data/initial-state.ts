import { generateId } from "@/lib/format";
import { crearMes } from "@/domain/presupuesto/mes";
import type {
  Deuda, GastoFijoItem, Mes, Posicion, PresupuestoBase, PuntoHistorico,
} from "@/domain/types";

// --------- CARTERA INICIAL (edítala desde la propia interfaz) ----------------
// tipo: "fondo" | "etf" | "cripto" | "efectivo"
// Para "efectivo": participaciones = saldo en €, precio = 1, sin ticker.
export const CARTERA_INICIAL: Posicion[] = [
  { id: "world",    nombre: "Fidelity MSCI World",       ticker: "0P0000KSPA.F", tipo: "fondo",    participaciones: 30.12,    precio: 18.72,   grupo: "rv" },
  { id: "em",       nombre: "Fidelity Emerging Markets", ticker: "0P0000KSP9.F", tipo: "fondo",    participaciones: 11.85,    precio: 12.86,   grupo: "rv" },
  { id: "nasdaq",   nombre: "iShares Nasdaq 100",        ticker: "CNDX.L",       tipo: "etf",      participaciones: 0.142,    precio: 1024.86, grupo: "rv" },
  { id: "btc",      nombre: "Bitcoin",                   ticker: "BTC-EUR",      tipo: "cripto",   participaciones: 0.003441, precio: 60848.0, grupo: "btc" },
  { id: "liquidez", nombre: "Fondo emergencia / casa",   ticker: "",             tipo: "efectivo", participaciones: 489.93,   precio: 1,       grupo: "liquidez" },
];

export const HISTORICO_INICIAL: PuntoHistorico[] = [
  { mes: "Feb 26", total: 618 }, { mes: "Mar 26", total: 1046 },
  { mes: "Abr 26", total: 1300 }, { mes: "May 26", total: 1450 }, { mes: "Jun 26", total: 1561 },
];

// --------- DEUDAS INICIALES (edítalas desde la pestaña Metas) ---------------
export const DEUDAS_INICIAL: Deuda[] = [
  { id: "coche",      nombre: "Coche (financiación)",              cuota: 173.28, saldo: 8000, nota: "En curso, sin fecha de fin fija" },
  { id: "applewatch", nombre: "Apple Watch (revolving 24% TAE)",   cuota: 75,     saldo: 105,  nota: "Liquidar antes del 10 de julio 2026", limite: "2026-07-10" },
  { id: "kindle",     nombre: "Kindle",                            cuota: 44,     saldo: 132,  nota: "Liquida en septiembre 2026" },
  { id: "ledger",     nombre: "Ledger Nano X (3 plazos)",          cuota: 39.53,  saldo: 79.06, nota: "Financiada jul–ago–sep 2026" },
];

// --------- PRESUPUESTO ------------------------------------------------------
export const PRESUPUESTO_BASE_INICIAL: PresupuestoBase = {
  ingresoNeto: 1766,
  gastosFijos: 778.89,
  inversion: 293,
  fondoEmergencia: 325,
  ocio: 270,
  caprichos: 100,
};

// Desglose editable de "Gastos fijos": la suma de estas líneas alimenta presupuestoBase.gastosFijos.
export const GASTOS_FIJOS_INICIAL: GastoFijoItem[] = [
  { id: generateId(), nombre: "Coche (financiación)", importe: 173.28 },
  { id: generateId(), nombre: "Suministros, seguros, suscripciones y otros fijos", importe: 605.61 },
];

export const MESES_INICIAL: Mes[] = [
  crearMes(2026, 6, { inversion: 225, fondoEmergencia: 203 }, [{ id: generateId(), nombre: "Liquidar Apple Watch + Kindle + Ledger 1/3", importe: 188.53, categoria: "gastosFijos" }]),
  crearMes(2026, 7, { inversion: 225, fondoEmergencia: 309 }, [{ id: generateId(), nombre: "Kindle + Ledger 2/3", importe: 83.05, categoria: "gastosFijos" }]),
  crearMes(2026, 8, { inversion: 225, fondoEmergencia: 137 }, [{ id: generateId(), nombre: "Liquidar Kindle + Ledger 3/3", importe: 129.28, categoria: "gastosFijos" }]),
  crearMes(2026, 9, { inversion: 293, fondoEmergencia: 199 }),
  crearMes(2026, 10, { inversion: 293, fondoEmergencia: 199 }),
  crearMes(2026, 11, { inversion: 293, fondoEmergencia: 199 }),
  crearMes(2027, 0),
  crearMes(2027, 1),
  crearMes(2027, 2),
  crearMes(2027, 3),
  crearMes(2027, 4),
  crearMes(2027, 5),
];
