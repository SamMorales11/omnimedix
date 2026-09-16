import { createMiddleware } from "hono/factory";
import type { Role } from "@omnimedix/shared";
import { verifyToken } from "../lib/auth";
import { UnauthorizedError } from "../lib/errors";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AppEnv {
  Variables: {
    user?: AuthUser;
  };
}

/**
 * Middleware to authenticate requests via Bearer JWT token
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError(
      "Token otentikasi (Bearer token) tidak ditemukan.",
    );
  }

  const token = authHeader.substring(7).trim();
  const payload = await verifyToken(token);

  if (!payload) {
    throw new UnauthorizedError("Token tidak valid atau sudah kedaluwarsa.");
  }

  const user: AuthUser = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };

  c.set("user", user);
  await next();
});
