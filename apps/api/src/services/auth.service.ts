import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users, doctors } from "@omnimedix/db";
import { verifyPassword, signToken } from "../lib/auth";
import { UnauthorizedError, NotFoundError } from "../lib/errors";
import type { Role } from "@omnimedix/shared";

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  doctorProfile?: {
    id: string;
    poliId: string;
    specialization: string;
    isActive: boolean;
  } | null;
}

export interface LoginResult {
  token: string;
  user: SafeUser;
}

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const trimmedEmail = email.trim().toLowerCase();

    const [foundUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, trimmedEmail))
      .limit(1);

    if (!foundUser) {
      throw new UnauthorizedError(
        "Email atau password tidak sesuai.",
        "INVALID_CREDENTIALS",
      );
    }

    if (!foundUser.isActive) {
      throw new UnauthorizedError(
        "Akun Anda dinonaktifkan. Silakan hubungi administrator.",
        "ACCOUNT_DISABLED",
      );
    }

    const isMatch = await verifyPassword(password, foundUser.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError(
        "Email atau password tidak sesuai.",
        "INVALID_CREDENTIALS",
      );
    }

    // Sign JWT token with sub, role, name, email
    const token = await signToken({
      sub: foundUser.id,
      role: foundUser.role as Role,
      name: foundUser.name,
      email: foundUser.email,
    });

    let doctorProfile = null;
    if (foundUser.role === "DOCTOR") {
      const [doc] = await db
        .select()
        .from(doctors)
        .where(eq(doctors.userId, foundUser.id))
        .limit(1);

      if (doc) {
        doctorProfile = {
          id: doc.id,
          poliId: doc.poliId,
          specialization: doc.specialization,
          isActive: doc.isActive,
        };
      }
    }

    const safeUser: SafeUser = {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      role: foundUser.role as Role,
      isActive: foundUser.isActive,
      createdAt: foundUser.createdAt,
      updatedAt: foundUser.updatedAt,
      doctorProfile,
    };

    return { token, user: safeUser };
  }

  /**
   * Get current authenticated user profile without password_hash
   */
  async getMe(userId: string): Promise<SafeUser> {
    const [foundUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!foundUser) {
      throw new NotFoundError(
        "Data pengguna tidak ditemukan.",
        "USER_NOT_FOUND",
      );
    }

    if (!foundUser.isActive) {
      throw new UnauthorizedError("Akun dinonaktifkan.", "ACCOUNT_DISABLED");
    }

    let doctorProfile = null;
    if (foundUser.role === "DOCTOR") {
      const [doc] = await db
        .select()
        .from(doctors)
        .where(eq(doctors.userId, foundUser.id))
        .limit(1);

      if (doc) {
        doctorProfile = {
          id: doc.id,
          poliId: doc.poliId,
          specialization: doc.specialization,
          isActive: doc.isActive,
        };
      }
    }

    return {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      role: foundUser.role as Role,
      isActive: foundUser.isActive,
      createdAt: foundUser.createdAt,
      updatedAt: foundUser.updatedAt,
      doctorProfile,
    };
  }
}

export const authService = new AuthService();
