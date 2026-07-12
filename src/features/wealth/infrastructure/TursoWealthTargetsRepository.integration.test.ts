import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TursoWealthTargetsRepository } from "@/features/wealth/infrastructure/TursoWealthTargetsRepository";
import { TestDatabaseFactory, type TestDatabase } from "@/infrastructure/db/__fixtures__/TestDatabaseFactory";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";

describe("TursoWealthTargetsRepository", () => {
  let testDatabase: TestDatabase;
  let repository: TursoWealthTargetsRepository;

  beforeEach(async () => {
    testDatabase = await new TestDatabaseFactory().create();
    repository = new TursoWealthTargetsRepository(testDatabase.database);
    await testDatabase.seedUser("user-1");
    await testDatabase.seedUser("user-2");
  });

  afterEach(async () => {
    await testDatabase.close();
  });

  it("should return null when the wealth targets have not been seeded yet for the user", async () => {
    await expect(repository.find("user-1")).resolves.toBeNull();
  });

  it("should round-trip the wealth targets through save and find", async () => {
    const targets: WealthTargets = {
      emergencyFund: 4900, minimumFund: 1000,
      equityTargets: { world: 60, em: 20, nasdaq: 20 },
      btcPauseWeight: 40, btcSellWeight: 50, btcPauseCapital: 10000, btcSellCapital: 20000,
    };

    await repository.save("user-1", targets);
    const storedTargets = await repository.find("user-1");

    expect(storedTargets).toEqual(targets);
  });

  it("should overwrite the existing wealth targets on a second save call for the same user", async () => {
    const initialTargets: WealthTargets = {
      emergencyFund: 4900, minimumFund: 1000,
      equityTargets: { world: 60, em: 20, nasdaq: 20 },
      btcPauseWeight: 40, btcSellWeight: 50, btcPauseCapital: 10000, btcSellCapital: 20000,
    };
    const revisedTargets: WealthTargets = { ...initialTargets, emergencyFund: 6000, equityTargets: { world: 70, em: 15, nasdaq: 15 } };

    await repository.save("user-1", initialTargets);
    await repository.save("user-1", revisedTargets);
    const storedTargets = await repository.find("user-1");

    expect(storedTargets).toEqual(revisedTargets);
  });

  it("should keep wealth targets isolated per user", async () => {
    const firstUserTargets: WealthTargets = {
      emergencyFund: 4900, minimumFund: 1000,
      equityTargets: { world: 60, em: 20, nasdaq: 20 },
      btcPauseWeight: 40, btcSellWeight: 50, btcPauseCapital: 10000, btcSellCapital: 20000,
    };
    const secondUserTargets: WealthTargets = {
      emergencyFund: 8000, minimumFund: 2000,
      equityTargets: { world: 50, em: 30, nasdaq: 20 },
      btcPauseWeight: 30, btcSellWeight: 45, btcPauseCapital: 15000, btcSellCapital: 25000,
    };

    await repository.save("user-1", firstUserTargets);
    await repository.save("user-2", secondUserTargets);

    expect(await repository.find("user-1")).toEqual(firstUserTargets);
    expect(await repository.find("user-2")).toEqual(secondUserTargets);
  });
});
