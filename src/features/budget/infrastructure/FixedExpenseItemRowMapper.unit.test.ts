import { describe, expect, it } from "vitest";
import { FixedExpenseItemRowMapper } from "@/features/budget/infrastructure/FixedExpenseItemRowMapper";
import type { FixedExpenseItem } from "@/features/budget/domain/types";

describe("FixedExpenseItemRowMapper", () => {
  const mapper = new FixedExpenseItemRowMapper();

  it("should map a row into the domain FixedExpenseItem shape, dropping the sort order", () => {
    const row = { id: "coche", name: "Coche (financiación)", amount: 173.28, sortOrder: 0 };

    expect(mapper.toDomain(row)).toEqual<FixedExpenseItem>({ id: "coche", name: "Coche (financiación)", amount: 173.28 });
  });

  it("should map a domain FixedExpenseItem back into a row carrying the given sort order", () => {
    const item: FixedExpenseItem = { id: "coche", name: "Coche (financiación)", amount: 173.28 };

    const row = mapper.toRow(item, 2);

    expect(row).toEqual({ id: "coche", name: "Coche (financiación)", amount: 173.28, sortOrder: 2 });
  });
});
