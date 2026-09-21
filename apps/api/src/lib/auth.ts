import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@omnimedix/shared";

const BCRYPT_SALT_ROUNDS = 12;
const DEFAULT_JWT_EXPIRES_IN = "24h";

export interface JwtTokenPayload {
  sub: string; // userId (UUID)
  role: Role;
  name: string;
  email: string;
  iat?: number;
  exp?: number;
}

function getJwtSecretKey(): Uint8Array {
  const secret = process.env["JWT_SECRET"];
  if (!secret && process.env["NODE_ENV"] === "production") {
    throw new Error(
      "CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing in production!",
    );
  }
  return new TextEncoder().encode(
    secret || "omnimedix-dev-default-jwt-secret-key-change-in-prod",
  );
}

/**
 * Hash raw password using bcryptjs with cost factor 12
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify plain text password against bcrypt hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign JWT token using jose
 */
export async function signToken(
  payload: Omit<JwtTokenPayload, "iat" | "exp">,
  expiresIn = DEFAULT_JWT_EXPIRES_IN,
): Promise<string> {
  const secretKey = getJwtSecretKey();

  return new SignJWT({
    role: payload.role,
    name: payload.name,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Verify and decode JWT token using jose
 */
export async function verifyToken(
  token: string,
): Promise<JwtTokenPayload | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    if (
      typeof payload.sub !== "string" ||
      typeof payload["role"] !== "string" ||
      typeof payload["name"] !== "string" ||
      typeof payload["email"] !== "string"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      role: payload["role"] as Role,
      name: payload["name"] as string,
      email: payload["email"] as string,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
