import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TursoPortfolioRepository } from "@/features/wealth/infrastructure/TursoPortfolioRepository";
import { TursoPositionTransactionRepository } from "@/features/wealth/infrastructure/TursoPositionTransactionRepository";
import { TestDatabaseFactory, type TestDatabase } from "@/infrastructure/db/__fixtures__/TestDatabaseFactory";
import type { Position } from "@/features/wealth/domain/types";
import type { PositionTransaction } from "@/features/wealth/domain/PositionTransaction";

describe("TursoPositionTransactionRepository", () => {
  let testDatabase: TestDatabase;
  let repository: TursoPositionTransactionRepository;
  const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc" };

  beforeEach(async () => {
    testDatabase = await new TestDatabaseFactory().create();
    repository = new TursoPositionTransactionRepository(testDatabase.database);
    await new TursoPortfolioRepository(testDatabase.database).saveAll([bitcoin]);
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return an empty list when the position has no recorded transactions", async () => {
    const transactions = await repository.findByPositionId(bitcoin.id);

    expect(transactions).toEqual([]);
  });

  it("should round-trip a buy transaction through save and findByPositionId", async () => {
    const purchase: PositionTransaction = {
      id: "tx-1", positionId: bitcoin.id, kind: "buy",
      executedAt: new Date("2026-06-01T00:00:00.000Z"), units: 0.001, price: 55000, fee: 1.5,
    };

    await repository.save(purchase);
    const transactions = await repository.findByPositionId(bitcoin.id);

    expect(transactions).toEqual([purchase]);
  });

  it("should only return transactions belonging to the requested position", async () => {
    const otherPosition: Position = { id: "world", name: "Fidelity MSCI World", ticker: "0P0001CLDK.F", type: "fondo", units: 30.12, price: 13.9762, group: "rv" };
    await new TursoPortfolioRepository(testDatabase.database).saveAll([bitcoin, otherPosition]);
    const bitcoinPurchase: PositionTransaction = { id: "tx-1", positionId: bitcoin.id, kind: "buy", executedAt: new Date("2026-06-01T00:00:00.000Z"), units: 0.001, price: 55000 };
    const worldPurchase: PositionTransaction = { id: "tx-2", positionId: otherPosition.id, kind: "buy", executedAt: new Date("2026-06-01T00:00:00.000Z"), units: 1, price: 14 };

    await repository.save(bitcoinPurchase);
    await repository.save(worldPurchase);
    const transactions = await repository.findByPositionId(bitcoin.id);

    expect(transactions).toEqual([bitcoinPurchase]);
  });
});
