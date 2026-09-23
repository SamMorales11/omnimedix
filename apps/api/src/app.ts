import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { AppError } from "./lib/errors";
import type { AppEnv } from "./middleware/auth";
import { authRoutes } from "./routes/auth";
import { publicRoutes } from "./routes/public";
import { doctorRoutes } from "./routes/doctor";
import { pharmacistRoutes } from "./routes/pharmacist";
import { adminRoutes } from "./routes/admin";

export function createApp() {
  const app = new Hono<AppEnv>();

  // 1. CORS middleware: mendukung domain Vercel (*.vercel.app), localhost, CORS_ORIGIN, dan testing
  app.use(
    "*",
    cors({
      origin: (origin) => {
        // Request tanpa origin header (server-to-server, curl, mobile client)
        if (!origin) return "*";

        // Izinkan domain Vercel (*.vercel.app baik preview maupun production)
        if (/^https:\/\/([a-zA-Z0-9-_]+\.)*vercel\.app$/.test(origin)) {
          return origin;
        }

        // Izinkan development lokal (localhost & 127.0.0.1)
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return origin;
        }

        // Izinkan origin kustom dari environment variable (jika dikonfigurasi)
        if (process.env["CORS_ORIGIN"]) {
          const envOrigins = process.env["CORS_ORIGIN"]
            .split(",")
            .map((o) => o.trim());
          if (envOrigins.includes(origin) || envOrigins.includes("*")) {
            return origin;
          }
        }

        // Fallback: izinkan origin yang melakukan request untuk kelancaran testing
        return origin;
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
  app.route("/api/admin", adminRoutes);
  app.route("/admin", adminRoutes);

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
