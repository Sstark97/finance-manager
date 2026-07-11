import type { Month } from "@/features/budget/domain/types";
import type { MonthRepository } from "@/features/budget/application/MonthRepository";
import type { DatabaseExecutor } from "@/infrastructure/db/client";
import { budgetMonths, budgetMonthCategories, budgetEvents } from "@/infrastructure/db/schema";
import { MonthRowMapper } from "@/features/budget/infrastructure/MonthRowMapper";

export class TursoMonthRepository implements MonthRepository {
  constructor(
    private readonly database: DatabaseExecutor,
    private readonly mapper: MonthRowMapper = new MonthRowMapper(),
  ) {}

  async findAll(): Promise<Month[]> {
    const [monthRows, categoryRows, eventRows] = await Promise.all([
      this.database.select().from(budgetMonths).orderBy(budgetMonths.date),
      this.database.select().from(budgetMonthCategories),
      this.database.select().from(budgetEvents),
    ]);

    return monthRows.map((monthRow) =>
      this.mapper.toDomain(
        monthRow,
        categoryRows.filter((categoryRow) => categoryRow.monthId === monthRow.id),
        eventRows.filter((eventRow) => eventRow.monthId === monthRow.id),
      ),
    );
  }

  async saveAll(months: Month[]): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.delete(budgetEvents);
      await transaction.delete(budgetMonthCategories);
      await transaction.delete(budgetMonths);

      if (months.length === 0) {
        return;
      }

      await transaction.insert(budgetMonths).values(months.map((month) => this.mapper.toMonthRow(month)));

      const categoryRows = months.flatMap((month) => this.mapper.toCategoryRows(month));
      if (categoryRows.length > 0) {
        await transaction.insert(budgetMonthCategories).values(categoryRows);
      }

      const eventRows = months.flatMap((month) => this.mapper.toEventRows(month));
      if (eventRows.length > 0) {
        await transaction.insert(budgetEvents).values(eventRows);
      }
    });
  }
}
