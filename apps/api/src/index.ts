import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app";

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
export * from "./services/auth.service";
export * from "./services/doctor.service";
export * from "./routes/doctor";
