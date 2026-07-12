import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TursoPortfolioRepository } from "@/features/wealth/infrastructure/TursoPortfolioRepository";
import {
  PositionNotOwnedByUserError,
  TursoPositionTransactionRepository,
} from "@/features/wealth/infrastructure/TursoPositionTransactionRepository";
import { TestDatabaseFactory, type TestDatabase } from "@/infrastructure/db/__fixtures__/TestDatabaseFactory";
import type { Position } from "@/features/wealth/domain/types";
import type { PositionTransaction } from "@/features/wealth/domain/PositionTransaction";

describe("TursoPositionTransactionRepository", () => {
  let testDatabase: TestDatabase;
  let repository: TursoPositionTransactionRepository;
  const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc", equityIndex: null };

  beforeEach(async () => {
    testDatabase = await new TestDatabaseFactory().create();
    repository = new TursoPositionTransactionRepository(testDatabase.database);
    await testDatabase.seedUser("user-1");
    await new TursoPortfolioRepository(testDatabase.database).saveAll("user-1", [bitcoin]);
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return an empty list when the position has no recorded transactions", async () => {
    const transactions = await repository.findByPositionId("user-1", bitcoin.id);

    expect(transactions).toEqual([]);
  });

  it("should round-trip a buy transaction through save and findByPositionId", async () => {
    const purchase: PositionTransaction = {
      id: "tx-1", positionId: bitcoin.id, kind: "buy",
      executedAt: new Date("2026-06-01T00:00:00.000Z"), units: 0.001, price: 55000, fee: 1.5,
    };

    await repository.save("user-1", purchase);
    const transactions = await repository.findByPositionId("user-1", bitcoin.id);

    expect(transactions).toEqual([purchase]);
  });

  it("should only return transactions belonging to the requested position", async () => {
    const otherPosition: Position = { id: "world", name: "Fidelity MSCI World", ticker: "0P0001CLDK.F", type: "fondo", units: 30.12, price: 13.9762, group: "rv", equityIndex: "world" };
    await new TursoPortfolioRepository(testDatabase.database).saveAll("user-1", [bitcoin, otherPosition]);
    const bitcoinPurchase: PositionTransaction = { id: "tx-1", positionId: bitcoin.id, kind: "buy", executedAt: new Date("2026-06-01T00:00:00.000Z"), units: 0.001, price: 55000 };
    const worldPurchase: PositionTransaction = { id: "tx-2", positionId: otherPosition.id, kind: "buy", executedAt: new Date("2026-06-01T00:00:00.000Z"), units: 1, price: 14 };

    await repository.save("user-1", bitcoinPurchase);
    await repository.save("user-1", worldPurchase);
    const transactions = await repository.findByPositionId("user-1", bitcoin.id);

    expect(transactions).toEqual([bitcoinPurchase]);
  });

  it("should not return transactions when the position belongs to a different user", async () => {
    const purchase: PositionTransaction = { id: "tx-1", positionId: bitcoin.id, kind: "buy", executedAt: new Date("2026-06-01T00:00:00.000Z"), units: 0.001, price: 55000 };
    await repository.save("user-1", purchase);

    const transactions = await repository.findByPositionId("user-2", bitcoin.id);

    expect(transactions).toEqual([]);
  });

  it("should reject saving a transaction for a position owned by a different user", async () => {
    await testDatabase.seedUser("user-2");
    const purchase: PositionTransaction = { id: "tx-1", positionId: bitcoin.id, kind: "buy", executedAt: new Date("2026-06-01T00:00:00.000Z"), units: 0.001, price: 55000 };

    await expect(repository.save("user-2", purchase)).rejects.toThrow(PositionNotOwnedByUserError);
  });
});
