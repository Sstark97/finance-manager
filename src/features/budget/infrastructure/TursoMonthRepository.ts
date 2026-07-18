import { eq, inArray } from "drizzle-orm";
import type { Month } from "@/features/budget/domain/types";
import type { MonthRepository } from "@/features/budget/application/MonthRepository";
import type { DatabaseExecutor } from "@/infrastructure/db/client";
import { budgetMonths, budgetMonthCategories, budgetEvents, budgetMovements } from "@/infrastructure/db/schema";
import { MonthRowMapper } from "@/features/budget/infrastructure/MonthRowMapper";

export class TursoMonthRepository implements MonthRepository {
  constructor(
    private readonly database: DatabaseExecutor,
    private readonly mapper: MonthRowMapper = new MonthRowMapper(),
  ) {}

  async findAll(userId: string): Promise<Month[]> {
    const monthRows = await this.database.select().from(budgetMonths).where(eq(budgetMonths.userId, userId)).orderBy(budgetMonths.date);
    const monthIds = monthRows.map((monthRow) => monthRow.id);
    if (monthIds.length === 0) {
      return [];
    }

    const [categoryRows, eventRows, movementRows] = await Promise.all([
      this.database.select().from(budgetMonthCategories).where(inArray(budgetMonthCategories.monthId, monthIds)),
      this.database.select().from(budgetEvents).where(inArray(budgetEvents.monthId, monthIds)),
      this.database.select().from(budgetMovements).where(inArray(budgetMovements.monthId, monthIds)),
    ]);

    return monthRows.map((monthRow) =>
      this.mapper.toDomain(
        monthRow,
        categoryRows.filter((categoryRow) => categoryRow.monthId === monthRow.id),
        eventRows.filter((eventRow) => eventRow.monthId === monthRow.id),
        movementRows.filter((movementRow) => movementRow.monthId === monthRow.id),
      ),
    );
  }

  async saveAll(userId: string, months: Month[]): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const existingMonthRows = await transaction.select({ id: budgetMonths.id }).from(budgetMonths).where(eq(budgetMonths.userId, userId));
      const existingMonthIds = existingMonthRows.map((row) => row.id);
      if (existingMonthIds.length > 0) {
        await transaction.delete(budgetMovements).where(inArray(budgetMovements.monthId, existingMonthIds));
        await transaction.delete(budgetEvents).where(inArray(budgetEvents.monthId, existingMonthIds));
        await transaction.delete(budgetMonthCategories).where(inArray(budgetMonthCategories.monthId, existingMonthIds));
        await transaction.delete(budgetMonths).where(eq(budgetMonths.userId, userId));
      }

      if (months.length === 0) {
        return;
      }

      await transaction.insert(budgetMonths).values(months.map((month) => this.mapper.toMonthRow(month, userId)));

      const categoryRows = months.flatMap((month) => this.mapper.toCategoryRows(month));
      if (categoryRows.length > 0) {
        await transaction.insert(budgetMonthCategories).values(categoryRows);
      }

      const eventRows = months.flatMap((month) => this.mapper.toEventRows(month));
      if (eventRows.length > 0) {
        await transaction.insert(budgetEvents).values(eventRows);
      }

      const movementRows = months.flatMap((month) => this.mapper.toMovementRows(month));
      if (movementRows.length > 0) {
        await transaction.insert(budgetMovements).values(movementRows);
      }
    });
  }
}
