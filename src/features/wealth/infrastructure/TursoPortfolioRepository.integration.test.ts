import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TursoPortfolioRepository } from "@/features/wealth/infrastructure/TursoPortfolioRepository";
import { TestDatabaseFactory, type TestDatabase } from "@/infrastructure/db/__fixtures__/TestDatabaseFactory";
import type { Position } from "@/features/wealth/domain/types";

describe("TursoPortfolioRepository", () => {
  let testDatabase: TestDatabase;
  let repository: TursoPortfolioRepository;

  beforeEach(async () => {
    testDatabase = await new TestDatabaseFactory().create();
    repository = new TursoPortfolioRepository(testDatabase.database);
    await testDatabase.seedUser("user-1");
    await testDatabase.seedUser("user-2");
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return an empty list when no position has been saved yet", async () => {
    const positions = await repository.findAll("user-1");

    expect(positions).toEqual([]);
  });

  it("should round-trip a priced position through save and findAll", async () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc", equityIndex: null };

    await repository.saveAll("user-1", [bitcoin]);
    const positions = await repository.findAll("user-1");

    expect(positions).toEqual([bitcoin]);
  });

  it("should round-trip a fund position's assigned equityIndex through save and findAll", async () => {
    const worldFund: Position = { id: "world", name: "Fidelity MSCI World", ticker: "0P0001CLDK.F", type: "fondo", units: 30.12, price: 13.9762, group: "rv", equityIndex: "world" };

    await repository.saveAll("user-1", [worldFund]);
    const positions = await repository.findAll("user-1");

    expect(positions).toEqual([worldFund]);
    expect(positions[0].equityIndex).toBe("world");
  });

  it("should replace the previously saved positions when saveAll is called again for the same user", async () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc", equityIndex: null };
    const cash: Position = { id: "liquidez", name: "Fondo emergencia", ticker: "", type: "efectivo", units: 489.93, price: 1, group: "liquidez", equityIndex: null };

    await repository.saveAll("user-1", [bitcoin]);
    await repository.saveAll("user-1", [cash]);
    const positions = await repository.findAll("user-1");

    expect(positions).toEqual([cash]);
  });

  it("should keep positions isolated per user so one user never sees another user's portfolio", async () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc", equityIndex: null };
    const cash: Position = { id: "liquidez", name: "Fondo emergencia", ticker: "", type: "efectivo", units: 489.93, price: 1, group: "liquidez", equityIndex: null };

    await repository.saveAll("user-1", [bitcoin]);
    await repository.saveAll("user-2", [cash]);

    expect(await repository.findAll("user-1")).toEqual([bitcoin]);
    expect(await repository.findAll("user-2")).toEqual([cash]);
  });

  it("should not delete another user's positions when saving the current user's portfolio", async () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc", equityIndex: null };
    const cash: Position = { id: "liquidez", name: "Fondo emergencia", ticker: "", type: "efectivo", units: 489.93, price: 1, group: "liquidez", equityIndex: null };
    await repository.saveAll("user-1", [bitcoin]);
    await repository.saveAll("user-2", [cash]);

    await repository.saveAll("user-1", []);

    expect(await repository.findAll("user-1")).toEqual([]);
    expect(await repository.findAll("user-2")).toEqual([cash]);
  });
});
