import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Automatically load .env from workspace root if available
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  dotenv.config({ path: resolve(__dirname, "../../../.env") });
} catch {
  dotenv.config();
}

export type DbClient = NeonHttpDatabase<typeof schema>;

export function createDb(connectionString?: string): DbClient {
  const url = connectionString || process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }
  const sql: NeonQueryFunction<boolean, boolean> = neon(url);
  return drizzle(sql, { schema });
}

// Lazy/singleton client for convenient direct import
let _db: DbClient | null = null;

export const getDb = (): DbClient => {
  if (!_db) {
    _db = createDb();
  }
  return _db;
};

export const db = new Proxy({} as DbClient, {
  get(_target, prop, receiver) {
    const instance = getDb();
    return Reflect.get(instance, prop, receiver);
  },
});
