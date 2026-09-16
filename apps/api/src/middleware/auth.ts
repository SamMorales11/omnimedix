import { createMiddleware } from "hono/factory";
import type { Role } from "@omnimedix/shared";
import { verifyToken } from "../lib/auth";
import { UnauthorizedError } from "../lib/errors";

export interface AuthContextUser {
  id: string;
  role: Role;
  name: string;
  email: string;
}

export interface AppEnv {
  Variables: {
    user: AuthContextUser;
  };
}

/**
 * Middleware to authenticate requests via Bearer JWT token
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError(
      "Header Authorization Bearer token tidak ditemukan.",
      "TOKEN_MISSING",
    );
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new UnauthorizedError("Token otentikasi kosong.", "TOKEN_EMPTY");
  }

  const payload = await verifyToken(token);
  if (!payload) {
    throw new UnauthorizedError(
      "Token otentikasi tidak valid atau telah kedaluwarsa.",
      "TOKEN_INVALID",
    );
  }

  const user: AuthContextUser = {
    id: payload.sub,
    role: payload.role,
    name: payload.name,
    email: payload.email,
  };

  c.set("user", user);
  await next();
});
