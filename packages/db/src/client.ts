import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// 1. Muat .env relatif dari letak file client.ts
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Jalur packages/db/.env (1 tingkat di atas src/)
  dotenv.config({ path: resolve(__dirname, "../.env") });

  // Jalur root monorepo .env (3 tingkat di atas src/)
  dotenv.config({ path: resolve(__dirname, "../../../.env") });
} catch {
  // Abaikan jika import.meta.url tidak tersedia di environment runtime
}

// 2. Muat .env relatif dari current working directory (lokasi terminal dieksekusi)
dotenv.config();
dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), "packages/db/.env") });

export type DbClient = NeonDatabase<typeof schema>;

export function createDb(connectionString?: string): DbClient {
  const url = connectionString || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema });
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
