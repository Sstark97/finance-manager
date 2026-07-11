import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

if (process.env.TURSO_DATABASE_URL) {
  console.log("TURSO_DATABASE_URL is set — skipping local dev database setup.");
  process.exit(0);
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(currentDirectory, "../drizzle");

// Keep this path in sync with LOCAL_DEV_DATABASE_URL in src/infrastructure/db/client.ts.
const databaseDirectory = path.join(tmpdir(), "finance-manager-dev");
const databasePath = path.join(databaseDirectory, "local.db");

mkdirSync(databaseDirectory, { recursive: true });

const client = createClient({ url: `file:${databasePath}` });
await migrate(drizzle(client), { migrationsFolder });
client.close();

console.log(`Local dev database ready at ${databasePath}`);
