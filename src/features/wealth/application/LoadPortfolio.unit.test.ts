import { describe, expect, it } from "vitest";
import { LoadPortfolio } from "@/features/wealth/application/LoadPortfolio";
import type { PortfolioRepository } from "@/features/wealth/application/PortfolioRepository";
import type { Position } from "@/features/wealth/domain/types";

class FakePortfolioRepository implements PortfolioRepository {
  constructor(private readonly positions: Position[]) {}

  async findAll(): Promise<Position[]> {
    return this.positions;
  }

  async saveAll(): Promise<void> {
    throw new Error("not used in this test");
  }
}

describe("LoadPortfolio", () => {
  it("should return every position stored in the repository", async () => {
    const bitcoin: Position = { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.003441, price: 60848, group: "btc" };
    const useCase = new LoadPortfolio(new FakePortfolioRepository([bitcoin]));

    const positions = await useCase.invoke();

    expect(positions).toEqual([bitcoin]);
  });
});
