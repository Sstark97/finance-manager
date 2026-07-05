import { generateId } from "@/lib/format";
import { createMonth } from "@/features/budget/domain/month";
import type { FixedExpenseItem, Month, Budget } from "@/features/budget/domain/types";

// --------- PRESUPUESTO ------------------------------------------------------
export const BUDGET_BASE_INITIAL: Budget = {
  ingresoNeto: 1766,
  gastosFijos: 778.89,
  inversion: 293,
  fondoEmergencia: 325,
  ocio: 270,
  caprichos: 100,
};

// Desglose editable de "Gastos fijos": la suma de estas líneas alimenta budgetBase.gastosFijos.
export const FIXED_EXPENSES_INITIAL: FixedExpenseItem[] = [
  { id: generateId(), name: "Coche (financiación)", amount: 173.28 },
  { id: generateId(), name: "Suministros, seguros, suscripciones y otros fijos", amount: 605.61 },
];

export const MONTHS_INITIAL: Month[] = [
  createMonth(2026, 6, { inversion: 225, fondoEmergencia: 203 }, [{ id: generateId(), name: "Liquidar Apple Watch + Kindle + Ledger 1/3", amount: 188.53, category: "gastosFijos" }]),
  createMonth(2026, 7, { inversion: 225, fondoEmergencia: 309 }, [{ id: generateId(), name: "Kindle + Ledger 2/3", amount: 83.05, category: "gastosFijos" }]),
  createMonth(2026, 8, { inversion: 225, fondoEmergencia: 137 }, [{ id: generateId(), name: "Liquidar Kindle + Ledger 3/3", amount: 129.28, category: "gastosFijos" }]),
  createMonth(2026, 9, { inversion: 293, fondoEmergencia: 199 }),
  createMonth(2026, 10, { inversion: 293, fondoEmergencia: 199 }),
  createMonth(2026, 11, { inversion: 293, fondoEmergencia: 199 }),
  createMonth(2027, 0),
  createMonth(2027, 1),
  createMonth(2027, 2),
  createMonth(2027, 3),
  createMonth(2027, 4),
  createMonth(2027, 5),
];
