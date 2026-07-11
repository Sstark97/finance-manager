import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

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
client.close();

console.log(`E2E database migrated and ready at ${databasePath}`);
