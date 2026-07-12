import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import bcrypt from "bcryptjs";
import { E2E_TEST_USER } from "./testUser.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "../..");
const migrationsFolder = path.join(projectRoot, "drizzle");

// The test database must live outside the project tree: Next.js dev's file watcher observes
// every path under the project root, and each write to a SQLite file inside it (including its
// -wal/-journal companions) would trigger Fast Refresh, remounting the app and re-triggering
// mount effects in an infinite loop.
const databaseDirectory = path.join(tmpdir(), "finance-manager-e2e");
const databasePath = path.join(databaseDirectory, "e2e-test.db");

rmSync(databaseDirectory, { recursive: true, force: true });
mkdirSync(databaseDirectory, { recursive: true });

const client = createClient({ url: `file:${databasePath}` });
const database = drizzle(client);
await migrate(database, { migrationsFolder });

const passwordHash = await bcrypt.hash(E2E_TEST_USER.password, 4);
await client.execute({
  sql: "insert into user (id, name, email, password_hash) values (?, ?, ?, ?)",
  args: [E2E_TEST_USER.id, "E2E Test User", E2E_TEST_USER.email, passwordHash],
});

// Baseline fixture data owned by the seeded e2e user, so specs that exercise the editing
// workspaces (not the empty-state onboarding screens) have something to load and persist
// against. This is test infrastructure, not the app-level demo seed that was removed.
const now = Date.now();
const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

await client.execute({
  sql: "insert into positions (id, user_id, name, ticker, type, units, group_name, last_price, equity_index, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  args: ["e2e-position-btc", E2E_TEST_USER.id, "Bitcoin", "BTC-EUR", "cripto", 0.05, "btc", 60000, null, now],
});

await client.execute({
  sql: "insert into debts (id, user_id, name, installment, balance, note, deadline) values (?, ?, ?, ?, ?, ?, ?)",
  args: ["e2e-debt-coche", E2E_TEST_USER.id, "Coche", 173.28, 8000, "En curso", null],
});

await client.execute({
  sql: "insert into budget_base (user_id, ingreso_neto, gastos_fijos, inversion, fondo_emergencia, ocio, caprichos) values (?, ?, ?, ?, ?, ?, ?)",
  args: [E2E_TEST_USER.id, 1766, 778.89, 293, 325, 270, 100],
});

await client.execute({
  sql: "insert into fixed_expense_items (id, user_id, name, amount, sort_order) values (?, ?, ?, ?, ?)",
  args: ["e2e-fixed-expense", E2E_TEST_USER.id, "Suministros y seguros", 605.61, 0],
});

await client.execute({
  sql: "insert into budget_months (id, user_id, date, label, net_income_override) values (?, ?, ?, ?, ?)",
  args: ["e2e-month-current", E2E_TEST_USER.id, currentMonthStart, "mes actual", null],
});

await client.execute({
  sql: "insert into goals_settings (user_id, current_salary, fi_contribution, fi_return, btc_savings, btc_disposable, btc_dca_active) values (?, ?, ?, ?, ?, ?, ?)",
  args: [E2E_TEST_USER.id, 27000, 293, 0.07, 0, 1, 1],
});

await client.execute({
  sql: "insert into wealth_targets (user_id, emergency_fund, minimum_fund, equity_target_world, equity_target_em, equity_target_nasdaq, btc_pause_weight, btc_sell_weight, btc_pause_capital, btc_sell_capital) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  args: [E2E_TEST_USER.id, 4900, 1000, 60, 20, 20, 40, 50, 10000, 20000],
});

client.close();

console.log(`E2E database migrated and ready at ${databasePath}, seeded test user ${E2E_TEST_USER.email}`);
