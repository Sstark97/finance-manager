import { sqliteTable, text, integer, real, primaryKey, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  passwordHash: text("password_hash"),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
);

export const positions = sqliteTable(
  "positions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ticker: text("ticker").notNull(),
    type: text("type").notNull(),
    units: real("units").notNull(),
    groupName: text("group_name").notNull(),
    lastPrice: real("last_price"),
    equityIndex: text("equity_index"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("positions_user_id_idx").on(table.userId)],
);

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

export const debts = sqliteTable(
  "debts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    installment: real("installment").notNull(),
    balance: real("balance").notNull(),
    note: text("note").notNull(),
    deadline: text("deadline"),
    settledAt: text("settled_at"),
  },
  (table) => [index("debts_user_id_idx").on(table.userId)],
);

export const budgetBase = sqliteTable("budget_base", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  ingresoNeto: real("ingreso_neto").notNull(),
  gastosFijos: real("gastos_fijos").notNull(),
  inversion: real("inversion").notNull(),
  fondoEmergencia: real("fondo_emergencia").notNull(),
  ocio: real("ocio").notNull(),
  caprichos: real("caprichos").notNull(),
});

export const fixedExpenseItems = sqliteTable(
  "fixed_expense_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: real("amount").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("fixed_expense_items_user_id_idx").on(table.userId)],
);

export const budgetMonths = sqliteTable(
  "budget_months",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: integer("date").notNull(),
    label: text("label").notNull(),
    netIncomeOverride: real("net_income_override"),
  },
  (table) => [index("budget_months_user_id_idx").on(table.userId)],
);

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
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  currentSalary: real("current_salary").notNull(),
  fiContribution: real("fi_contribution").notNull(),
  fiReturn: real("fi_return").notNull(),
  btcSavings: real("btc_savings").notNull(),
  btcDisposable: integer("btc_disposable").notNull(),
  btcDcaActive: integer("btc_dca_active").notNull(),
});

export const wealthTargets = sqliteTable("wealth_targets", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  emergencyFund: real("emergency_fund").notNull(),
  minimumFund: real("minimum_fund").notNull(),
  equityTargetWorld: real("equity_target_world").notNull(),
  equityTargetEm: real("equity_target_em").notNull(),
  equityTargetNasdaq: real("equity_target_nasdaq").notNull(),
  btcPauseWeight: real("btc_pause_weight").notNull(),
  btcSellWeight: real("btc_sell_weight").notNull(),
  btcPauseCapital: real("btc_pause_capital").notNull(),
  btcSellCapital: real("btc_sell_capital").notNull(),
});
