import type { CategoryId, EventCategory, BudgetEvent, Month } from "@/features/budget/domain/types";
import type { BudgetMovement } from "@/features/budget/domain/BudgetMovement";
import type { budgetMonths, budgetMonthCategories, budgetEvents, budgetMovements } from "@/infrastructure/db/schema";

type MonthRow = typeof budgetMonths.$inferSelect;
type NewMonthRow = typeof budgetMonths.$inferInsert;
type MonthCategoryRow = typeof budgetMonthCategories.$inferSelect;
type NewMonthCategoryRow = typeof budgetMonthCategories.$inferInsert;
type BudgetEventRow = typeof budgetEvents.$inferSelect;
type NewBudgetEventRow = typeof budgetEvents.$inferInsert;
type BudgetMovementRow = typeof budgetMovements.$inferSelect;
type NewBudgetMovementRow = typeof budgetMovements.$inferInsert;

export class MonthRowMapper {
  toDomain(
    monthRow: MonthRow,
    categoryRows: MonthCategoryRow[],
    eventRows: BudgetEventRow[],
    movementRows: BudgetMovementRow[] = [],
  ): Month {
    const overrides: Partial<Record<CategoryId, number>> = {};

    for (const categoryRow of categoryRows) {
      if (categoryRow.overrideAmount != null) {
        overrides[categoryRow.categoryId as CategoryId] = categoryRow.overrideAmount;
      }
    }

    const events: BudgetEvent[] = eventRows.map((eventRow) => ({
      id: eventRow.id,
      name: eventRow.name,
      amount: eventRow.amount,
      category: eventRow.category as EventCategory,
    }));

    const movements: BudgetMovement[] = movementRows.map((movementRow) => ({
      id: movementRow.id,
      categoryId: movementRow.categoryId as CategoryId,
      occurredAt: new Date(movementRow.occurredAt),
      amount: movementRow.amount,
      note: movementRow.note,
    }));

    return {
      id: monthRow.id,
      date: new Date(monthRow.date),
      label: monthRow.label,
      overrides,
      events,
      movements,
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
    const categoryIds = Object.keys(month.overrides) as CategoryId[];
    return categoryIds.map((categoryId) => ({
      monthId: month.id,
      categoryId,
      overrideAmount: month.overrides[categoryId] ?? null,
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

  toMovementRows(month: Month): NewBudgetMovementRow[] {
    return month.movements.map((movement) => ({
      id: movement.id,
      monthId: month.id,
      categoryId: movement.categoryId,
      occurredAt: movement.occurredAt.getTime(),
      amount: movement.amount,
      note: movement.note,
    }));
  }
}
