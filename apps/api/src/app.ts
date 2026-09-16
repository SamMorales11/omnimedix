import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { AppError } from "./lib/errors";
import type { AppEnv } from "./middleware/auth";
import { authRoutes } from "./routes/auth";

export function createApp() {
  const app = new Hono<AppEnv>();

  // 1. CORS middleware
  app.use(
    "*",
    cors({
      origin: (origin) => origin || "*",
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    }),
  );

  // 2. Simple Logger middleware
  app.use("*", logger());

  // 3. Health check endpoint
  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      service: "omnimedix-api",
      timestamp: new Date().toISOString(),
    });
  });

  // 4. API Routes
  app.route("/api/auth", authRoutes);
  app.route("/auth", authRoutes);

  // 5. Global 404 Handler
  app.notFound((c) => {
    return c.json(
      {
        success: false,
        message: `Rute '${c.req.method} ${c.req.path}' tidak ditemukan.`,
      },
      404,
    );
  });

  // 6. Global Error Handler
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(
        {
          success: false,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
        err.statusCode,
      );
    }

    // Default 500 internal server error
    const isProd = process.env["NODE_ENV"] === "production";
    return c.json(
      {
        success: false,
        message: isProd
          ? "Terjadi kesalahan internal pada server."
          : err.message,
        ...(!isProd && err.stack ? { stack: err.stack } : {}),
      },
      500,
    );
  });

  return app;
}

export const app = createApp();
export type AppType = typeof app;
