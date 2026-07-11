import { describe, expect, it } from "vitest";
import { DebtRowMapper } from "@/shared/infrastructure/DebtRowMapper";
import type { Debt } from "@/shared/domain/types";

describe("DebtRowMapper", () => {
  const mapper = new DebtRowMapper();

  it("should map a row with a deadline into a domain debt with that deadline", () => {
    const row = { id: "applewatch", name: "Apple Watch", installment: 75, balance: 105, note: "Liquidar antes de julio", deadline: "2026-07-10" };

    const debt = mapper.toDomain(row);

    expect(debt).toEqual<Debt>({ id: "applewatch", name: "Apple Watch", installment: 75, balance: 105, note: "Liquidar antes de julio", deadline: "2026-07-10" });
  });

  it("should map a row without a deadline into a domain debt with an undefined deadline", () => {
    const row = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre", deadline: null };

    const debt = mapper.toDomain(row);

    expect(debt.deadline).toBeUndefined();
  });

  it("should map a domain debt with a deadline back into a row keeping that deadline", () => {
    const debt: Debt = { id: "applewatch", name: "Apple Watch", installment: 75, balance: 105, note: "Liquidar antes de julio", deadline: "2026-07-10" };

    const row = mapper.toRow(debt);

    expect(row.deadline).toBe("2026-07-10");
  });

  it("should map a domain debt without a deadline back into a row with a null deadline", () => {
    const debt: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre" };

    const row = mapper.toRow(debt);

    expect(row.deadline).toBeNull();
  });
});
