import { describe, expect, it } from "vitest";
import { BudgetBaseRowMapper, BUDGET_BASE_SINGLETON_ID } from "@/features/budget/infrastructure/BudgetBaseRowMapper";
import type { Budget } from "@/features/budget/domain/types";

describe("BudgetBaseRowMapper", () => {
  const mapper = new BudgetBaseRowMapper();
  const budget: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };

  it("should map a budget base row into the domain Budget shape", () => {
    const row = { id: BUDGET_BASE_SINGLETON_ID, ...budget };

    expect(mapper.toDomain(row)).toEqual(budget);
  });

  it("should map a domain Budget back into a row keyed by the singleton id", () => {
    const row = mapper.toRow(budget);

    expect(row).toEqual({ id: BUDGET_BASE_SINGLETON_ID, ...budget });
  });
});
