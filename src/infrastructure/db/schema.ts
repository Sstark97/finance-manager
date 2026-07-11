import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

export const positions = sqliteTable("positions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ticker: text("ticker").notNull(),
  type: text("type").notNull(),
  units: real("units").notNull(),
  groupName: text("group_name").notNull(),
  lastPrice: real("last_price"),
  updatedAt: integer("updated_at").notNull(),
});

export const positionTransactions = sqliteTable("position_transactions", {
  id: text("id").primaryKey(),
  positionId: text("position_id").notNull().references(() => positions.id),
  kind: text("kind").notNull(),
  executedAt: integer("executed_at").notNull(),
  units: real("units").notNull(),
  price: real("price").notNull(),
  fee: real("fee"),
  createdAt: integer("created_at").notNull(),
});

export const debts = sqliteTable("debts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  installment: real("installment").notNull(),
  balance: real("balance").notNull(),
  note: text("note").notNull(),
  deadline: text("deadline"),
});

export const budgetBase = sqliteTable("budget_base", {
  id: text("id").primaryKey(),
  ingresoNeto: real("ingreso_neto").notNull(),
  gastosFijos: real("gastos_fijos").notNull(),
  inversion: real("inversion").notNull(),
  fondoEmergencia: real("fondo_emergencia").notNull(),
  ocio: real("ocio").notNull(),
  caprichos: real("caprichos").notNull(),
});

export const fixedExpenseItems = sqliteTable("fixed_expense_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const budgetMonths = sqliteTable("budget_months", {
  id: text("id").primaryKey(),
  date: integer("date").notNull(),
  label: text("label").notNull(),
  netIncomeOverride: real("net_income_override"),
});

export const budgetMonthCategories = sqliteTable("budget_month_categories", {
  monthId: text("month_id").notNull().references(() => budgetMonths.id),
  categoryId: text("category_id").notNull(),
  overrideAmount: real("override_amount"),
  actualAmount: real("actual_amount"),
}, (table) => [
  primaryKey({ columns: [table.monthId, table.categoryId] }),
]);

export const budgetEvents = sqliteTable("budget_events", {
  id: text("id").primaryKey(),
  monthId: text("month_id").notNull().references(() => budgetMonths.id),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
});

export const goalsSettings = sqliteTable("goals_settings", {
  id: text("id").primaryKey(),
  currentSalary: real("current_salary").notNull(),
  fiContribution: real("fi_contribution").notNull(),
  fiReturn: real("fi_return").notNull(),
  btcSavings: real("btc_savings").notNull(),
  btcDisposable: integer("btc_disposable").notNull(),
  btcDcaActive: integer("btc_dca_active").notNull(),
  countCar: integer("count_car").notNull(),
});
