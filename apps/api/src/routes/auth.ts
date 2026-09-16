import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { loginSchema, Role } from "@omnimedix/shared";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "@omnimedix/db";
import { comparePassword, createToken } from "../lib/auth";
import { requireAuth, type AppEnv } from "../middleware/auth";
import { UnauthorizedError } from "../lib/errors";

export const authRoutes = new Hono<AppEnv>()
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");

    let user = null;
    try {
      const found = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      user = found[0] ?? null;
    } catch {
      // In case DB is not yet populated or offline
    }

    if (user) {
      if (!user.isActive) {
        throw new UnauthorizedError(
          "Akun dinonaktifkan. Silakan hubungi administrator.",
        );
      }

      const isPasswordValid = await comparePassword(
        password,
        user.passwordHash,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedError("Email atau password salah.");
      }

      const token = await createToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
      });

      return c.json({
        success: true,
        message: "Login berhasil.",
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
      });
    }

    throw new UnauthorizedError("Email atau password tidak valid.");
  })
  .get("/me", requireAuth, (c) => {
    const currentUser = c.get("user");

    return c.json({
      success: true,
      data: {
        user: currentUser,
      },
    });
  });
