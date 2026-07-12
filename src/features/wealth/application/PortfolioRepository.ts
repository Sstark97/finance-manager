import type { Position } from "@/features/wealth/domain/types";

export interface PortfolioRepository {
  findAll(userId: string): Promise<Position[]>;
  saveAll(userId: string, positions: Position[]): Promise<void>;
}
