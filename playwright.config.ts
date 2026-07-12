import path from "node:path";
import { tmpdir } from "node:os";
import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./e2e/setup/global-setup";

const E2E_PORT = 3100;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
// Kept outside the project tree on purpose: Next.js dev's file watcher observes everything
// under the project root, and writes to a SQLite file (and its -wal/-journal companions)
// living inside it would trigger endless Fast Refresh remounts. See e2e/setup/prepare-database.mjs.
const E2E_DATABASE_URL = `file:${path.join(tmpdir(), "finance-manager-e2e", "e2e-test.db")}`;
const E2E_AUTH_SECRET = "e2e-test-only-secret-do-not-use-in-production-0123456789";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./e2e/setup/global-setup.ts",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    storageState: STORAGE_STATE_PATH,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `node e2e/setup/prepare-database.mjs && pnpm exec next dev --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      TURSO_DATABASE_URL: E2E_DATABASE_URL,
      AUTH_SECRET: E2E_AUTH_SECRET,
    },
  },
});
