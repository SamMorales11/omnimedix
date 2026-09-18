import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { AppError } from "./lib/errors";
import type { AppEnv } from "./middleware/auth";
import { authRoutes } from "./routes/auth";
import { publicRoutes } from "./routes/public";
import { doctorRoutes } from "./routes/doctor";
import { pharmacistRoutes } from "./routes/pharmacist";

export function createApp() {
  const app = new Hono<AppEnv>();

  // 1. Safe CORS middleware for development (localhost / 127.0.0.1) & configured clients
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return allowedOrigins[0]!;
        if (allowedOrigins.includes(origin)) return origin;
        // Allow any localhost/127.0.0.1 development ports (e.g. preview, alternative dev port)
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return origin;
        }
        return allowedOrigins[0]!;
      },
      allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    }),
  );

  // 2. Logger middleware
  app.use("*", logger());

  // 3. Health check endpoint
  app.get("/health", (c) => {
    return c.json({
      success: true,
      data: {
        status: "ok",
        service: "omnimedix-api",
        timestamp: new Date().toISOString(),
      },
    });
  });

  // 4. API Routes
  app.route("/api/auth", authRoutes);
  app.route("/auth", authRoutes);
  app.route("/api/public", publicRoutes);
  app.route("/public", publicRoutes);
  app.route("/api/doctor", doctorRoutes);
  app.route("/doctor", doctorRoutes);
  app.route("/api/pharmacist", pharmacistRoutes);
  app.route("/pharmacist", pharmacistRoutes);

  // 5. Global 404 Handler
  app.notFound((c) => {
    return c.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Rute '${c.req.method} ${c.req.path}' tidak ditemukan.`,
        },
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
          error: {
            code: err.code,
            message: err.message,
            ...(err.details ? { details: err.details } : {}),
          },
        },
        err.statusCode,
      );
    }

    // Default 500 internal server error
    const isProd = process.env["NODE_ENV"] === "production";
    return c.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: isProd
            ? "Terjadi kesalahan internal pada server."
            : err.message,
          ...(!isProd && err.stack ? { stack: err.stack } : {}),
        },
      },
      500,
    );
  });

  return app;
}

export const app = createApp();
export type AppType = typeof app;
