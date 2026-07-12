import { describe, expect, it } from "vitest";
import { LoadPortfolio } from "@/features/wealth/application/LoadPortfolio";
import type { PortfolioRepository } from "@/features/wealth/application/PortfolioRepository";
import type { Position } from "@/features/wealth/domain/types";

class FakePortfolioRepository implements PortfolioRepository {
  constructor(private readonly positionsByUserId: Record<string, Position[]>) {}

  async findAll(userId: string): Promise<Position[]> {
    return this.positionsByUserId[userId] ?? [];
  }

  async saveAll(): Promise<void> {
    throw new Error("not used in this test");
  }
}

describe("LoadPortfolio", () => {
  it("should return every position stored in the repository for the given user", async () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc", equityIndex: null };
    const useCase = new LoadPortfolio(new FakePortfolioRepository({ "user-1": [bitcoin] }));

    const positions = await useCase.invoke("user-1");

    expect(positions).toEqual([bitcoin]);
  });

  it("should not return positions belonging to a different user", async () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc", equityIndex: null };
    const useCase = new LoadPortfolio(new FakePortfolioRepository({ "user-1": [bitcoin] }));

    const positions = await useCase.invoke("user-2");

    expect(positions).toEqual([]);
  });
});
