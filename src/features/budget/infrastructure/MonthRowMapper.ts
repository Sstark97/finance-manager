import type { CategoryId, EventCategory, BudgetEvent, Month } from "@/features/budget/domain/types";
import type { budgetMonths, budgetMonthCategories, budgetEvents } from "@/infrastructure/db/schema";

type MonthRow = typeof budgetMonths.$inferSelect;
type NewMonthRow = typeof budgetMonths.$inferInsert;
type MonthCategoryRow = typeof budgetMonthCategories.$inferSelect;
type NewMonthCategoryRow = typeof budgetMonthCategories.$inferInsert;
type BudgetEventRow = typeof budgetEvents.$inferSelect;
type NewBudgetEventRow = typeof budgetEvents.$inferInsert;

export class MonthRowMapper {
  toDomain(monthRow: MonthRow, categoryRows: MonthCategoryRow[], eventRows: BudgetEventRow[]): Month {
    const overrides: Partial<Record<CategoryId, number>> = {};
    const actual: Partial<Record<CategoryId, number | null>> = {};

    for (const categoryRow of categoryRows) {
      const categoryId = categoryRow.categoryId as CategoryId;
      if (categoryRow.overrideAmount != null) {
        overrides[categoryId] = categoryRow.overrideAmount;
      }
      if (categoryRow.actualAmount != null) {
        actual[categoryId] = categoryRow.actualAmount;
      }
    }

    const events: BudgetEvent[] = eventRows.map((eventRow) => ({
      id: eventRow.id,
      name: eventRow.name,
      amount: eventRow.amount,
      category: eventRow.category as EventCategory,
    }));

    return {
      id: monthRow.id,
      date: new Date(monthRow.date),
      label: monthRow.label,
      overrides,
      events,
      actual,
      netIncomeOverride: monthRow.netIncomeOverride ?? null,
    };
  }

  toMonthRow(month: Month, userId: string): NewMonthRow {
    return {
      id: month.id,
      userId,
      date: month.date.getTime(),
      label: month.label,
      netIncomeOverride: month.netIncomeOverride,
    };
  }

  toCategoryRows(month: Month): NewMonthCategoryRow[] {
    const categoryIds = new Set<CategoryId>([
      ...(Object.keys(month.overrides) as CategoryId[]),
      ...(Object.keys(month.actual) as CategoryId[]),
    ]);
    return Array.from(categoryIds).map((categoryId) => ({
      monthId: month.id,
      categoryId,
      overrideAmount: month.overrides[categoryId] ?? null,
      actualAmount: month.actual[categoryId] ?? null,
    }));
  }

  toEventRows(month: Month): NewBudgetEventRow[] {
    return month.events.map((event) => ({
      id: event.id,
      monthId: month.id,
      name: event.name,
      amount: event.amount,
      category: event.category,
    }));
  }
}
