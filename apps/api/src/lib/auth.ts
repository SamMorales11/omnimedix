import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@omnimedix/shared";

const SALT_ROUNDS = 10;
const DEFAULT_JWT_EXPIRES_IN = "24h";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  iat?: number;
  exp?: number;
}

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env["JWT_SECRET"] || "omnimedix-super-secret-jwt-key-2026";
  return new TextEncoder().encode(secret);
}

/**
 * Hash raw password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare plain text password against bcrypt hash
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign JWT token using jose
 */
export async function createToken(
  payload: Omit<AuthTokenPayload, "iat" | "exp">,
  expiresIn = DEFAULT_JWT_EXPIRES_IN,
): Promise<string> {
  const secretKey = getJwtSecretKey();

  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
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
): Promise<AuthTokenPayload | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    if (
      typeof payload.sub !== "string" ||
      typeof payload["email"] !== "string" ||
      typeof payload["name"] !== "string" ||
      typeof payload["role"] !== "string"
    ) {
      return null;
    }

    return {
      ...payload,
      sub: payload.sub,
      email: payload["email"] as string,
      name: payload["name"] as string,
      role: payload["role"] as Role,
    };
  } catch {
    return null;
  }
}
