import { eq } from "drizzle-orm";
import type { Budget, FixedExpenseItem } from "@/features/budget/domain/types";
import type { BudgetRepository } from "@/features/budget/application/BudgetRepository";
import type { DatabaseExecutor } from "@/infrastructure/db/client";
import { budgetBase as budgetBaseTable, fixedExpenseItems as fixedExpenseItemsTable } from "@/infrastructure/db/schema";
import { BudgetBaseRowMapper, BUDGET_BASE_SINGLETON_ID } from "@/features/budget/infrastructure/BudgetBaseRowMapper";
import { FixedExpenseItemRowMapper } from "@/features/budget/infrastructure/FixedExpenseItemRowMapper";

export class TursoBudgetRepository implements BudgetRepository {
  constructor(
    private readonly database: DatabaseExecutor,
    private readonly budgetBaseMapper: BudgetBaseRowMapper = new BudgetBaseRowMapper(),
    private readonly fixedExpenseItemMapper: FixedExpenseItemRowMapper = new FixedExpenseItemRowMapper(),
  ) {}

  async findBase(): Promise<Budget | null> {
    const [row] = await this.database.select().from(budgetBaseTable).where(eq(budgetBaseTable.id, BUDGET_BASE_SINGLETON_ID));
    if (!row) {
      return null;
    }
    return this.budgetBaseMapper.toDomain(row);
  }

  async saveBase(budget: Budget): Promise<void> {
    await this.database
      .insert(budgetBaseTable)
      .values(this.budgetBaseMapper.toRow(budget))
      .onConflictDoUpdate({ target: budgetBaseTable.id, set: this.budgetBaseMapper.toRow(budget) });
  }

  async findFixedExpenseItems(): Promise<FixedExpenseItem[]> {
    const rows = await this.database.select().from(fixedExpenseItemsTable).orderBy(fixedExpenseItemsTable.sortOrder);
    return rows.map((row) => this.fixedExpenseItemMapper.toDomain(row));
  }

  async saveFixedExpenseItems(items: FixedExpenseItem[]): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.delete(fixedExpenseItemsTable);
      if (items.length === 0) {
        return;
      }
      await transaction
        .insert(fixedExpenseItemsTable)
        .values(items.map((item, index) => this.fixedExpenseItemMapper.toRow(item, index)));
    });
  }
}
