import { IdGenerator, idGenerator } from "@/lib/IdGenerator";
import type { CategoryId, BudgetEvent, Month } from "@/features/budget/domain/types";

export class MonthFactory {
  constructor(private readonly idGenerator: IdGenerator) {}

  create(
    year: number,
    monthIndex: number,
    overrides: Partial<Record<CategoryId, number>> = {},
    events: BudgetEvent[] = [],
  ): Month {
    return {
      id: this.idGenerator.generate(),
      date: new Date(year, monthIndex, 1),
      label: new Date(year, monthIndex, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).replace(".", ""),
      overrides, events, movements: [], netIncomeOverride: null,
    };
  }

  createCurrent(): Month {
    const today = new Date();
    return this.create(today.getFullYear(), today.getMonth());
  }
}

export const monthFactory = new MonthFactory(idGenerator);
