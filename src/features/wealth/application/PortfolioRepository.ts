import type { Position } from "@/features/wealth/domain/types";

export interface PortfolioRepository {
  findAll(): Promise<Position[]>;
  saveAll(positions: Position[]): Promise<void>;
}
