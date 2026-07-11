import { idGenerator } from "@/lib/IdGenerator";
import { monthFactory } from "@/features/budget/domain/MonthFactory";
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
  { id: idGenerator.generate(), name: "Coche (financiación)", amount: 173.28 },
  { id: idGenerator.generate(), name: "Suministros, seguros, suscripciones y otros fijos", amount: 605.61 },
];

export const MONTHS_INITIAL: Month[] = [
  monthFactory.create(2026, 6, { inversion: 225, fondoEmergencia: 203 }, [{ id: idGenerator.generate(), name: "Liquidar Apple Watch + Kindle + Ledger 1/3", amount: 188.53, category: "gastosFijos" }]),
  monthFactory.create(2026, 7, { inversion: 225, fondoEmergencia: 309 }, [{ id: idGenerator.generate(), name: "Kindle + Ledger 2/3", amount: 83.05, category: "gastosFijos" }]),
  monthFactory.create(2026, 8, { inversion: 225, fondoEmergencia: 137 }, [{ id: idGenerator.generate(), name: "Liquidar Kindle + Ledger 3/3", amount: 129.28, category: "gastosFijos" }]),
  monthFactory.create(2026, 9, { inversion: 293, fondoEmergencia: 199 }),
  monthFactory.create(2026, 10, { inversion: 293, fondoEmergencia: 199 }),
  monthFactory.create(2026, 11, { inversion: 293, fondoEmergencia: 199 }),
  monthFactory.create(2027, 0),
  monthFactory.create(2027, 1),
  monthFactory.create(2027, 2),
  monthFactory.create(2027, 3),
  monthFactory.create(2027, 4),
  monthFactory.create(2027, 5),
];
