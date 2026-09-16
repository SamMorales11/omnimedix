import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import { resolve } from "path";

// Load root .env
dotenv.config({ path: resolve(process.cwd(), "../../.env") });
dotenv.config();

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"] || "",
  },
  strict: true,
  verbose: true,
});
