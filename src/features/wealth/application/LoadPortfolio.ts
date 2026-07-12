import type { Position } from "@/features/wealth/domain/types";
import type { PortfolioRepository } from "@/features/wealth/application/PortfolioRepository";

export interface LoadPortfolioUseCase {
  invoke(userId: string): Promise<Position[]>;
}

export class LoadPortfolio implements LoadPortfolioUseCase {
  constructor(private readonly portfolioRepository: PortfolioRepository) {}

  async invoke(userId: string): Promise<Position[]> {
    return this.portfolioRepository.findAll(userId);
  }
}
