import { createMiddleware } from "hono/factory";
import type { Role } from "@omnimedix/shared";
import type { AppEnv } from "./auth";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";

/**
 * Middleware factory for Role-Based Access Control (RBAC)
 * Restricts route access to specified user roles.
 */
export function requireRoles(...allowedRoles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      throw new UnauthorizedError(
        "Sesi login tidak ditemukan. Silakan login terlebih dahulu.",
        "UNAUTHORIZED",
      );
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(
        `Akses ditolak. Role '${user.role}' tidak memiliki izin untuk mengakses resource ini.`,
        "FORBIDDEN_ROLE",
      );
    }

    await next();
  });
}
