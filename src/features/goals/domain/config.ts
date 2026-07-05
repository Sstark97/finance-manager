import type { Phase } from "@/features/goals/domain/types";

// --------- METAS ---------------------------------------------------------
export const FI_GOAL = { capital: 750000, currentAge: 28, targetAge: 50, monthlyIncome: 2250 };
export const HOUSING_GOAL = { criticalMass: 50000, horizon: "5–10 años" };
export const BTC_OP_GOAL = { target: 630, window: "sep–dic 2026" };

export const PHASES: Phase[] = [
  { id: 1, name: "Acumulación + Operación BTC", age: "28–31", minSalary: 0,     minPortfolio: 0,      description: "DCA 200€ fondos + 25€ BTC. Modo estanflación activo. Operación bear market ~630€. Cold wallet." },
  { id: 2, name: "Escalada + Japón en radar",    age: "31–35", minSalary: 35000, minPortfolio: 0,      description: "Aumentar aportaciones (regla 50/50). Evaluar Japón (Fidelity MSCI Japan) y oro adelantado." },
  { id: 3, name: "Small Caps + Renta Fija",      age: "35–40", minSalary: 50000, minPortfolio: 100000, description: "Vanguard Global Small-Cap 10%. Inicio renta fija. Posible estrategia vivienda con garantía." },
  { id: 4, name: "Consolidación + Oro",          age: "40–45", minSalary: 65000, minPortfolio: 200000, description: "Oro 5–10% (ETC físico). Renta fija 15–20%. Private Equity (máx 5%) si cartera >300K." },
  { id: 5, name: "Protección pre-retiro",        age: "45–50", minSalary: 65000, minPortfolio: 400000, description: "RV 65–70% / RF 20–25% / Oro 5–10%. Bitcoin: venta parcial si >30% del patrimonio." },
];
