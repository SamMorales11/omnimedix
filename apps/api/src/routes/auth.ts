import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { loginSchema } from "@omnimedix/shared";
import { authService } from "../services/auth.service";
import { requireAuth, type AppEnv } from "../middleware/auth";

export const authRoutes = new Hono<AppEnv>()
  /**
   * POST /auth/login
   * Public endpoint to authenticate users with email & password
   */
  .post(
    "/login",
    zValidator("json", loginSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Data input tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const { email, password } = c.req.valid("json");
      const result = await authService.login(email, password);

      return c.json(
        {
          success: true,
          message: "Login berhasil.",
          data: result,
        },
        200,
      );
    },
  )

  /**
   * GET /auth/me
   * Protected endpoint to get current authenticated user profile
   */
  .get("/me", requireAuth, async (c) => {
    const authContext = c.get("user");
    const userProfile = await authService.getMe(authContext.id);

    return c.json(
      {
        success: true,
        data: {
          user: userProfile,
        },
      },
      200,
    );
  })

  /**
   * POST /auth/logout
   * Client-side session clear confirmation
   */
  .post("/logout", (c) => {
    return c.json(
      {
        success: true,
        message: "Logout berhasil. Sesi telah diakhiri.",
        data: null,
      },
      200,
    );
  });
