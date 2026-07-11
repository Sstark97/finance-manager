import { describe, expect, it } from "vitest";
import { PositionRowMapper } from "@/features/wealth/infrastructure/PositionRowMapper";
import type { Position } from "@/features/wealth/domain/types";

describe("PositionRowMapper", () => {
  const mapper = new PositionRowMapper();

  it("should map a row with a stored last price into a position carrying that price as a snapshot", () => {
    const row = { id: "world", name: "Fidelity MSCI World", ticker: "0P0001CLDK.F", type: "fondo", units: 30.12, groupName: "rv", lastPrice: 13.9762, updatedAt: 1751000000000 };

    const position = mapper.toDomain(row);

    expect(position).toEqual<Position>({ id: "world", name: "Fidelity MSCI World", ticker: "0P0001CLDK.F", type: "fondo", units: 30.12, price: 13.9762, group: "rv" });
  });

  it("should default the price to zero when the row has never received a price snapshot", () => {
    const row = { id: "new", name: "Nueva posición", ticker: "", type: "fondo", units: 0, groupName: "rv", lastPrice: null, updatedAt: 1751000000000 };

    const position = mapper.toDomain(row);

    expect(position.price).toBe(0);
  });

  it("should map a position back into a row carrying the given updatedAt timestamp", () => {
    const position: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc" };

    const row = mapper.toRow(position, 1751000000000);

    expect(row).toEqual({ id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, groupName: "btc", lastPrice: 60848, updatedAt: 1751000000000 });
  });
});
