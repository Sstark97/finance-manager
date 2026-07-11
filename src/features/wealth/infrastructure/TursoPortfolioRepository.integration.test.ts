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
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return an empty list when no position has been saved yet", async () => {
    const positions = await repository.findAll();

    expect(positions).toEqual([]);
  });

  it("should round-trip a priced position through save and findAll", async () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc" };

    await repository.saveAll([bitcoin]);
    const positions = await repository.findAll();

    expect(positions).toEqual([bitcoin]);
  });

  it("should replace the previously saved positions when saveAll is called again", async () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc" };
    const cash: Position = { id: "liquidez", name: "Fondo emergencia", ticker: "", type: "efectivo", units: 489.93, price: 1, group: "liquidez" };

    await repository.saveAll([bitcoin]);
    await repository.saveAll([cash]);
    const positions = await repository.findAll();

    expect(positions).toEqual([cash]);
  });
});
