import { describe, expect, it } from "vitest";
import { DebtRowMapper } from "@/shared/infrastructure/DebtRowMapper";
import type { Debt } from "@/shared/domain/types";

describe("DebtRowMapper", () => {
  const mapper = new DebtRowMapper();

  it("should map a row with a deadline into a domain debt with that deadline", () => {
    const row = { id: "applewatch", userId: "user-1", name: "Apple Watch", installment: 75, balance: 105, note: "Liquidar antes de julio", isLongTerm: 0, deadline: "2026-07-10", settledAt: null };

    const debt = mapper.toDomain(row);

    expect(debt).toEqual<Debt>({ id: "applewatch", name: "Apple Watch", installment: 75, balance: 105, note: "Liquidar antes de julio", isLongTerm: false, deadline: "2026-07-10" });
  });

  it("should map a row without a deadline into a domain debt with an undefined deadline", () => {
    const row = { id: "kindle", userId: "user-1", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre", isLongTerm: 0, deadline: null, settledAt: null };

    const debt = mapper.toDomain(row);

    expect(debt.deadline).toBeUndefined();
  });

  it("should map a domain debt with a deadline back into a row keeping that deadline and the owning user", () => {
    const debt: Debt = { id: "applewatch", name: "Apple Watch", installment: 75, balance: 105, note: "Liquidar antes de julio", isLongTerm: false, deadline: "2026-07-10" };

    const row = mapper.toRow(debt, "user-1");

    expect(row.deadline).toBe("2026-07-10");
    expect(row.userId).toBe("user-1");
  });

  it("should map a domain debt without a deadline back into a row with a null deadline", () => {
    const debt: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre", isLongTerm: false };

    const row = mapper.toRow(debt, "user-1");

    expect(row.deadline).toBeNull();
  });

  it("should map a row with a settled_at into a domain debt with that settledAt", () => {
    const row = { id: "kindle", userId: "user-1", name: "Kindle", installment: 44, balance: 132, note: "Liquidada", isLongTerm: 0, deadline: null, settledAt: "2026-06-01" };

    const debt = mapper.toDomain(row);

    expect(debt).toEqual<Debt>({ id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquidada", isLongTerm: false, settledAt: "2026-06-01" });
  });

  it("should map a row without a settled_at into a domain debt with an undefined settledAt", () => {
    const row = { id: "coche", userId: "user-1", name: "Coche", installment: 173.28, balance: 8000, note: "En curso", isLongTerm: 0, deadline: null, settledAt: null };

    const debt = mapper.toDomain(row);

    expect(debt.settledAt).toBeUndefined();
  });

  it("should map a domain debt with a settledAt back into a row keeping that settled_at", () => {
    const debt: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquidada", isLongTerm: false, settledAt: "2026-06-01" };

    const row = mapper.toRow(debt, "user-1");

    expect(row.settledAt).toBe("2026-06-01");
  });

  it("should map a domain debt without a settledAt back into a row with a null settled_at", () => {
    const debt: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso", isLongTerm: false };

    const row = mapper.toRow(debt, "user-1");

    expect(row.settledAt).toBeNull();
  });

  it("should map a row flagged as long term into a domain debt with isLongTerm true", () => {
    const row = { id: "hipoteca", userId: "user-1", name: "Hipoteca", installment: 600, balance: 150000, note: "", isLongTerm: 1, deadline: null, settledAt: null };

    const debt = mapper.toDomain(row);

    expect(debt.isLongTerm).toBe(true);
  });

  it("should map a row not flagged as long term into a domain debt with isLongTerm false", () => {
    const row = { id: "coche", userId: "user-1", name: "Coche", installment: 173.28, balance: 8000, note: "En curso", isLongTerm: 0, deadline: null, settledAt: null };

    const debt = mapper.toDomain(row);

    expect(debt.isLongTerm).toBe(false);
  });

  it("should map a domain debt marked as long term back into a row with isLongTerm 1", () => {
    const debt: Debt = { id: "hipoteca", name: "Hipoteca", installment: 600, balance: 150000, note: "", isLongTerm: true };

    const row = mapper.toRow(debt, "user-1");

    expect(row.isLongTerm).toBe(1);
  });

  it("should map a domain debt not marked as long term back into a row with isLongTerm 0", () => {
    const debt: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso", isLongTerm: false };

    const row = mapper.toRow(debt, "user-1");

    expect(row.isLongTerm).toBe(0);
  });
});
