import { describe, expect, it } from "vitest";
import { PositionRowMapper } from "@/features/wealth/infrastructure/PositionRowMapper";
import type { Position } from "@/features/wealth/domain/types";

describe("PositionRowMapper", () => {
  const mapper = new PositionRowMapper();

  it("should map a row with a stored last price into a position carrying that price as a snapshot", () => {
    const row = { id: "world", userId: "user-1", name: "Fidelity MSCI World", ticker: "0P0001CLDK.F", type: "fondo", units: 30.12, groupName: "rv", lastPrice: 13.9762, equityIndex: "world", updatedAt: 1751000000000 };

    const position = mapper.toDomain(row);

    expect(position).toEqual<Position>({ id: "world", name: "Fidelity MSCI World", ticker: "0P0001CLDK.F", type: "fondo", units: 30.12, price: 13.9762, group: "rv", equityIndex: "world" });
  });

  it("should default the price to zero when the row has never received a price snapshot", () => {
    const row = { id: "new", userId: "user-1", name: "Nueva posición", ticker: "", type: "fondo", units: 0, groupName: "rv", lastPrice: null, equityIndex: null, updatedAt: 1751000000000 };

    const position = mapper.toDomain(row);

    expect(position.price).toBe(0);
  });

  it("should map equityIndex to null when the row has never been classified into an index", () => {
    const row = { id: "btc-row", userId: "user-1", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, groupName: "btc", lastPrice: 60848, equityIndex: null, updatedAt: 1751000000000 };

    const position = mapper.toDomain(row);

    expect(position.equityIndex).toBeNull();
  });

  it("should map a position back into a row carrying the owning user, its equityIndex and the given updatedAt timestamp", () => {
    const position: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc", equityIndex: null };

    const row = mapper.toRow(position, "user-1", 1751000000000);

    expect(row).toEqual({ id: "btc", userId: "user-1", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, groupName: "btc", lastPrice: 60848, equityIndex: null, updatedAt: 1751000000000 });
  });

  it("should round-trip a fondo position carrying an assigned equityIndex", () => {
    const position: Position = { id: "world", name: "Fidelity MSCI World", ticker: "0P0001CLDK.F", type: "fondo", units: 30.12, price: 13.9762, group: "rv", equityIndex: "world" };

    const row = mapper.toRow(position, "user-1", 1751000000000);

    expect(row.equityIndex).toBe("world");
  });
});
