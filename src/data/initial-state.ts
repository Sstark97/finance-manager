import { generateId } from "@/lib/format";
import { crearMes } from "@/domain/presupuesto/mes";
import type {
  GastoFijoItem, Mes, PresupuestoBase,
} from "@/domain/types";

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
