import { tmpdir } from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@/infrastructure/db/schema";

export type Database = LibSQLDatabase<typeof schema>;
export type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DatabaseExecutor = Database | DatabaseTransaction;

const LOCAL_DATABASE_BUSY_TIMEOUT_MS = 5000;

// Fixed path kept in sync with scripts/setup-local-dev-db.mjs, which migrates it before "next dev"
// starts. Lives outside the project tree: Next's dev file watcher would otherwise treat every
// SQLite WAL write as a source change and trigger endless Fast Refresh (see e2e/setup for the
// same constraint on the e2e database).
export const LOCAL_DEV_DATABASE_URL = `file:${path.join(tmpdir(), "finance-manager-dev", "local.db")}`;

export class TursoClientFactory {
  create(): Client {
    const url = process.env.TURSO_DATABASE_URL ?? this.localDevFallbackUrl();
    const authToken = process.env.TURSO_AUTH_TOKEN;
    return createClient({ url, authToken, timeout: LOCAL_DATABASE_BUSY_TIMEOUT_MS });
  }

  static toDatabase(client: Client): Database {
    return drizzle(client, { schema });
  }

  private localDevFallbackUrl(): string {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TURSO_DATABASE_URL environment variable is not set");
    }
    console.warn(
      `TURSO_DATABASE_URL is not set — using the local dev database at ${LOCAL_DEV_DATABASE_URL}. ` +
        `Set TURSO_DATABASE_URL/TURSO_AUTH_TOKEN in .env.local to point at a real Turso database instead.`,
    );
    return LOCAL_DEV_DATABASE_URL;
  }
}
