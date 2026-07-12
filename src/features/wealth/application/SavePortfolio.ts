import type { Position } from "@/features/wealth/domain/types";
import type { PortfolioRepository } from "@/features/wealth/application/PortfolioRepository";

export interface SavePortfolioUseCase {
  invoke(userId: string, positions: Position[]): Promise<void>;
}

export class SavePortfolio implements SavePortfolioUseCase {
  constructor(private readonly portfolioRepository: PortfolioRepository) {}

  async invoke(userId: string, positions: Position[]): Promise<void> {
    await this.portfolioRepository.saveAll(userId, positions);
  }
}
