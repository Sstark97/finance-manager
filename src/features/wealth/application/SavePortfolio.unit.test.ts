import { describe, expect, it } from "vitest";
import { SavePortfolio } from "@/features/wealth/application/SavePortfolio";
import type { PortfolioRepository } from "@/features/wealth/application/PortfolioRepository";
import type { Position } from "@/features/wealth/domain/types";

class RecordingPortfolioRepository implements PortfolioRepository {
  savedUserId: string | null = null;
  savedPositions: Position[] | null = null;

  async findAll(): Promise<Position[]> {
    throw new Error("not used in this test");
  }

  async saveAll(userId: string, positions: Position[]): Promise<void> {
    this.savedUserId = userId;
    this.savedPositions = positions;
  }
}

describe("SavePortfolio", () => {
  it("should persist the given positions for the given user through the repository", async () => {
    const repository = new RecordingPortfolioRepository();
    const useCase = new SavePortfolio(repository);
    const cash: Position = { id: "liquidez", name: "Fondo emergencia", ticker: "", type: "efectivo", units: 489.93, price: 1, group: "liquidez", equityIndex: null };

    await useCase.invoke("user-1", [cash]);

    expect(repository.savedUserId).toBe("user-1");
    expect(repository.savedPositions).toEqual([cash]);
  });
});
