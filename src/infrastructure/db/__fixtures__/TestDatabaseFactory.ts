import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import { TursoClientFactory, type Database } from "@/infrastructure/db/client";

const MIGRATIONS_FOLDER = path.resolve(__dirname, "../../../../drizzle");
const LOCAL_DATABASE_BUSY_TIMEOUT_MS = 5000;

export interface TestDatabase {
  client: Client;
  database: Database;
  close(): Promise<void>;
}

export class TestDatabaseFactory {
  async create(): Promise<TestDatabase> {
    const directory = mkdtempSync(path.join(tmpdir(), "finance-manager-test-db-"));
    const filePath = path.join(directory, "test.db");
    const client = createClient({ url: `file:${filePath}`, timeout: LOCAL_DATABASE_BUSY_TIMEOUT_MS });
    const database = TursoClientFactory.toDatabase(client);
    await migrate(database, { migrationsFolder: MIGRATIONS_FOLDER });

    return {
      client,
      database,
      close: async (): Promise<void> => {
        client.close();
        rmSync(directory, { recursive: true, force: true });
      },
    };
  }
}
