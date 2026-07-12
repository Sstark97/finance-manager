import { describe, expect, it } from "vitest";
import { BudgetBaseRowMapper } from "@/features/budget/infrastructure/BudgetBaseRowMapper";
import type { Budget } from "@/features/budget/domain/types";

describe("BudgetBaseRowMapper", () => {
  const mapper = new BudgetBaseRowMapper();
  const budget: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };

  it("should map a budget base row into the domain Budget shape", () => {
    const row = { userId: "user-1", ...budget };

    expect(mapper.toDomain(row)).toEqual(budget);
  });

  it("should map a domain Budget back into a row keyed by the owning user", () => {
    const row = mapper.toRow(budget, "user-1");

    expect(row).toEqual({ userId: "user-1", ...budget });
  });
});
