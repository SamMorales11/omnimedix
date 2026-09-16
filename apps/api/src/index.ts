import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { app } from "./app";

// Load root environment variables
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  dotenv.config({ path: resolve(__dirname, "../../../.env") });
} catch {
  dotenv.config();
}

const PORT = Number(process.env["PORT"]) || 3000;

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.info(
      `🚀 Omnimedix API Server running on http://localhost:${info.port}`,
    );
  },
);

export * from "./app";
export * from "./lib/auth";
export * from "./lib/errors";
export * from "./middleware/auth";
export * from "./middleware/rbac";
