import { generateId } from "@/lib/format";
import type { CategoryId, BudgetEvent, Month } from "@/features/budget/domain/types";

export const createMonth = (
  year: number,
  monthIndex: number,
  overrides: Partial<Record<CategoryId, number>> = {},
  events: BudgetEvent[] = [],
): Month => ({
  id: generateId(),
  date: new Date(year, monthIndex, 1),
  label: new Date(year, monthIndex, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).replace(".", ""),
  overrides, events, actual: {}, netIncomeOverride: null,
});

export const monthKey = (date: Date): number => date.getFullYear() * 12 + date.getMonth();

export const isMonthAvailable = (date: Date): boolean => monthKey(date) <= monthKey(new Date());
