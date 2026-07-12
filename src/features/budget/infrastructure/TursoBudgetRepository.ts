import { eq } from "drizzle-orm";
import type { Budget, FixedExpenseItem } from "@/features/budget/domain/types";
import type { BudgetRepository } from "@/features/budget/application/BudgetRepository";
import type { DatabaseExecutor } from "@/infrastructure/db/client";
import { budgetBase as budgetBaseTable, fixedExpenseItems as fixedExpenseItemsTable } from "@/infrastructure/db/schema";
import { BudgetBaseRowMapper } from "@/features/budget/infrastructure/BudgetBaseRowMapper";
import { FixedExpenseItemRowMapper } from "@/features/budget/infrastructure/FixedExpenseItemRowMapper";

export class TursoBudgetRepository implements BudgetRepository {
  constructor(
    private readonly database: DatabaseExecutor,
    private readonly budgetBaseMapper: BudgetBaseRowMapper = new BudgetBaseRowMapper(),
    private readonly fixedExpenseItemMapper: FixedExpenseItemRowMapper = new FixedExpenseItemRowMapper(),
  ) {}

  async findBase(userId: string): Promise<Budget | null> {
    const [row] = await this.database.select().from(budgetBaseTable).where(eq(budgetBaseTable.userId, userId));
    if (!row) {
      return null;
    }
    return this.budgetBaseMapper.toDomain(row);
  }

  async saveBase(userId: string, budget: Budget): Promise<void> {
    const row = this.budgetBaseMapper.toRow(budget, userId);
    await this.database.insert(budgetBaseTable).values(row).onConflictDoUpdate({ target: budgetBaseTable.userId, set: row });
  }

  async findFixedExpenseItems(userId: string): Promise<FixedExpenseItem[]> {
    const rows = await this.database
      .select()
      .from(fixedExpenseItemsTable)
      .where(eq(fixedExpenseItemsTable.userId, userId))
      .orderBy(fixedExpenseItemsTable.sortOrder);
    return rows.map((row) => this.fixedExpenseItemMapper.toDomain(row));
  }

  async saveFixedExpenseItems(userId: string, items: FixedExpenseItem[]): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.delete(fixedExpenseItemsTable).where(eq(fixedExpenseItemsTable.userId, userId));
      if (items.length === 0) {
        return;
      }
      await transaction
        .insert(fixedExpenseItemsTable)
        .values(items.map((item, index) => this.fixedExpenseItemMapper.toRow(item, userId, index)));
    });
  }
}
